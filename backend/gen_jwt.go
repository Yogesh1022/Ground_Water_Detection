package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
)

func main() {
    bytes := make([]byte, 32) // 32 bytes = 64 hex characters
    _, _ = rand.Read(bytes)
    fmt.Println(hex.EncodeToString(bytes))
}
