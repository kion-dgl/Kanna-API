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

type User struct {
	ID        string `db:"id" json:"id"`
	Username  string `db:"username" json:"username"`
	StartDate string `db:"start_date" json:"startDate"`
	ThreadID  string `db:"thread_id" json:"threadId"`
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
	// 	// Select all records and scan into an array of Users
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

	// Convert to JSON
	jsonData, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to convert to JSON: %v", err)
	}

	// Print JSON
	fmt.Println(string(jsonData))
}
