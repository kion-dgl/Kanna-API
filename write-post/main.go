package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

func main() {
	// Optionally load .env file if it exists (for local testing)
	if _, err := os.Stat(".env"); err == nil {
		err := godotenv.Load()
		if err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
	}

	// Read environment variables
	dbURL := os.Getenv("TURSO_DB_URL")
	token := os.Getenv("TURSO_TOKEN")
	openAPIToken := os.Getenv("OPENAPI_TOKEN")

	if dbURL == "" || token == "" || openAPIToken == "" {
		log.Fatal("Database URL, authentication token, or OpenAPI token not found in environment variables")
	}

	// Append token as a query parameter
	fullURL := fmt.Sprintf("%s?authToken=%s", dbURL, token)
	db, err := sql.Open("libsql", fullURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to Turso database successfully!")

	// Select all records
	selectQuery := `SELECT id, username, start_date FROM users;`
	rows, err := db.Query(selectQuery)
	if err != nil {
		log.Fatalf("Failed to query records: %v", err)
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id int
		var username, startDate string
		err := rows.Scan(&id, &username, &startDate)
		if err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		results = append(results, map[string]interface{}{
			"id":         id,
			"username":   username,
			"start_date": startDate,
		})
	}

	assistantID := "asst_IUjxjQhjPtaDpKO5yCVs2Ez3"
	threadID := "thread_a9x4t7O5pQbO0dPtkZMPBWKw"

	// Loop over the list of results
	for _, user := range results {
		startDate, err := time.Parse("2006-01-02", user["start_date"].(string))
		if err != nil {
			log.Printf("Failed to parse start_date for user %v: %v", user["username"], err)
			continue
		}

		daysElapsed := int(time.Since(startDate).Hours() / 24)
		messageContent := fmt.Sprintf("day %d", daysElapsed)

		// Send message
		messagePayload := map[string]interface{}{
			"role": "user",
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": messageContent,
				},
			},
		}
		messagePayloadBytes, err := json.Marshal(messagePayload)
		if err != nil {
			log.Printf("Failed to marshal message payload for user %v: %v", user["username"], err)
			continue
		}

		messageReq, err := http.NewRequest("POST", fmt.Sprintf("https://api.openai.com/v1/threads/%s/messages", threadID), bytes.NewBuffer(messagePayloadBytes))
		if err != nil {
			log.Printf("Failed to create message request for user %v: %v", user["username"], err)
			continue
		}
		messageReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", openAPIToken))
		messageReq.Header.Set("Content-Type", "application/json")
		messageReq.Header.Set("OpenAI-Beta", "assistants=v2")

		messageResp, err := http.DefaultClient.Do(messageReq)
		if err != nil {
			log.Printf("Failed to send message request for user %v: %v", user["username"], err)
			continue
		}
		defer messageResp.Body.Close()

		messageBody, err := io.ReadAll(messageResp.Body)
		if err != nil {
			log.Printf("Failed to read message response body for user %v: %v", user["username"], err)
			continue
		}

		log.Printf("Message response for user %v: %s", user["username"], string(messageBody))

		if messageResp.StatusCode != http.StatusOK {
			log.Printf("Received non-OK message response for user %v: %s", user["username"], messageResp.Status)
			continue
		}

		// Trigger run
		runPayload := map[string]interface{}{
			"assistant_id": assistantID,
		}
		runPayloadBytes, err := json.Marshal(runPayload)
		if err != nil {
			log.Printf("Failed to marshal run payload for user %v: %v", user["username"], err)
			continue
		}

		runReq, err := http.NewRequest("POST", fmt.Sprintf("https://api.openai.com/v1/threads/%s/runs", threadID), bytes.NewBuffer(runPayloadBytes))
		if err != nil {
			log.Printf("Failed to create run request for user %v: %v", user["username"], err)
			continue
		}
		runReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", openAPIToken))
		runReq.Header.Set("Content-Type", "application/json")
		runReq.Header.Set("OpenAI-Beta", "assistants=v2")

		runResp, err := http.DefaultClient.Do(runReq)
		if err != nil {
			log.Printf("Failed to send run request for user %v: %v", user["username"], err)
			continue
		}
		defer runResp.Body.Close()

		runBody, err := io.ReadAll(runResp.Body)
		if err != nil {
			log.Printf("Failed to read run response body for user %v: %v", user["username"], err)
			continue
		}

		log.Printf("Run response for user %v: %s", user["username"], string(runBody))

		if runResp.StatusCode != http.StatusOK {
			log.Printf("Received non-OK run response for user %v: %s", user["username"], runResp.Status)
			continue
		}
	}
}
