package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	dbURL := os.Getenv("TURSO_DB_URL")
	token := os.Getenv("TURSO_TOKEN")

	if dbURL == "" || token == "" {
		log.Fatal("Database URL or authentication token not found in environment variables")
	}

	// Append token as a query parameter
	fullURL := fmt.Sprintf("%s?authToken=%s", dbURL, token)
	db, err := sql.Open("libsql", fullURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to Turso database successfully!")

	// Create the table
	createTableQuery := `
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL,
			start_date DATE NOT NULL
		);`
	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Failed to create table: %v", err)
	}

	// Insert a record
	insertQuery := `INSERT INTO users (username, start_date) VALUES (?, ?);`
	_, err = db.Exec(insertQuery, "@wagieweeb", "2024-12-06")
	if err != nil {
		log.Fatalf("Failed to insert record: %v", err)
	}

	// Select all records
	selectQuery := `SELECT id, username, start_date FROM users;`
	rows, err := db.Query(selectQuery)
	if err != nil {
		log.Fatalf("Failed to query records: %v", err)
	}
	defer rows.Close()

	// Fetch all rows and store in a slice
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

	// Convert results to JSON
	output, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal results: %v", err)
	}

	// Save the JSON output as an artifact
	outputFile := "artifact.json"
	err = os.WriteFile(outputFile, output, 0644)
	if err != nil {
		log.Fatalf("Failed to write artifact: %v", err)
	}

	fmt.Printf("Artifact saved to %s\n", outputFile)
}
