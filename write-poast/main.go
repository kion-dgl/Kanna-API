package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

type User struct {
	ID        string `db:"id" json:"id"`
	Username  string `db:"username" json:"username"`
	StartDate string `db:"start_date" json:"startDate"`
	ThreadID  string `db:"thread_id" json:"threadId"`
}

type OpenAIResponse struct {
	ID string `json:"id"` // Extract the thread ID from the response
}

func createThread(openAPIToken string) (string, error) {
	url := "https://api.openai.com/v1/threads"

	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(`{}`)))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+openAPIToken)
	req.Header.Set("OpenAI-Beta", "assistants=v2")

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenAI API: %v", err)
	}
	defer resp.Body.Close()

	// Read the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %v", err)
	}

	// Parse the JSON response
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status code: %d, response: %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	err = json.Unmarshal(body, &openAIResp)
	if err != nil {
		return "", fmt.Errorf("failed to parse OpenAI API response: %v", err)
	}

	return openAIResp.ID, nil
}

func main() {

	// Load the local .env file (if exists)
	_, err := os.Stat(".env")
	if err == nil {
		err = godotenv.Load()
		if err != nil {
			log.Fatalf("Error loading env file: %v", err)
		}
	}

	// Read Environment Variables
	dbURL := os.Getenv("TURSO_DB_URL")
	token := os.Getenv("TURSO_TOKEN")
	openAPIToken := os.Getenv("OPENAPI_TOKEN")

	if dbURL == "" || token == "" || openAPIToken == "" {
		log.Fatal("Database URL, authentication token, or OpenAPI token not found in environment variables")
	}

	// Connect to Turso Database
	fullURL := fmt.Sprintf("%s?authToken=%s", dbURL, token)
	db, err := sql.Open("libsql", fullURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to Turso database successfully!")

	// Initialize user table
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
		username TEXT UNIQUE NOT NULL,
		start_date DATE NOT NULL DEFAULT CURRENT_DATE,
		thread_id TEXT NOT NULL DEFAULT ''
	);`
	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}
	fmt.Println("User Table created successfully!")

	// Create example user kion "wagieweeb"
	insertQuery := `
	INSERT OR IGNORE INTO users (
		username,
		start_date
	)
	VALUES (
		?,
		?
	);`
	_, err = db.Exec(insertQuery, "wagieweeb", "2024-12-06")
	if err != nil {
		log.Fatalf("Failed to insert default user: %v", err)
	}
	fmt.Println("Default user inserted (or already exists).")

	// Select all users from table
	selectQuery := `SELECT id, username, start_date, thread_id FROM users;`
	rows, err := db.Query(selectQuery)
	if err != nil {
		log.Fatalf("Failed to query records: %v", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Username, &user.StartDate, &user.ThreadID); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Error occurred during iteration: %v", err)
	}

	jsonData, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to convert to JSON: %v", err)
	}
	fmt.Println(string(jsonData))

	// Check thread id for each user and create one if needed
	for i, user := range users {
		if user.ThreadID == "" {
			fmt.Printf("Creating thread for user: %s\n", user.Username)

			// Call OpenAI API to create a thread
			threadID, err := createThread(openAPIToken)
			if err != nil {
				log.Printf("Failed to create thread for user %s: %v", user.Username, err)
				continue
			}

			// Update database with the new thread ID
			updateQuery := `UPDATE users SET thread_id = ? WHERE id = ?;`
			_, err = db.Exec(updateQuery, threadID, user.ID)
			if err != nil {
				log.Printf("Failed to update thread ID in database for user %s: %v", user.Username, err)
				continue
			}

			// Update the thread ID in the users array
			users[i].ThreadID = threadID
			fmt.Printf("Thread created and updated for user %s: %s\n", user.Username, threadID)
		}
	}


}
