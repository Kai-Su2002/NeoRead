package neoread

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"neoread.local/server/internal/scholar"
)

func TestAutoPaperTitleFallback(t *testing.T) {
	s := testServer(t)
	scholarFixture(t, s)
	upstream, calls := fakeAPI(t, func(_ int, _ apiCall) string { return `{"title":"A Reliable Paper Title"}` })
	config := AIConfig{Primary: "api", API: APIConnection{URL: upstream.URL + "/v1", Key: "sk-test"}, TranslationModels: map[string]string{"api": "deepseek-flash"}}
	passModels(&config, map[string]bool{"deepseek-flash": false})
	if err := s.writeAIConfig(config); err != nil {
		t.Fatal(err)
	}
	temp := t.TempDir()
	node := filepath.Join(temp, "node")
	script := "#!/bin/sh\nprintf '%s' '{\"metadata\":{},\"pages\":[\"A Reliable Paper Title\\nAuthors and abstract\"]}' > \"$5\"\n"
	if err := os.WriteFile(node, []byte(script), 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("NEOREAD_NODE", node)
	t.Setenv("NEOREAD_PROCESSOR", filepath.Join(temp, "main.mjs"))
	w := uploadTo(t, s, "papers", "random.pdf", testPDF(1))
	var d Document
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	revision := s.connectorRevision.Load()
	got, err := s.autoPaperLookup(context.Background(), d.ID)
	if err != nil || got.Title != "A Reliable Paper Title" || got.Metadata.Lookup != "notFound" {
		t.Fatalf("got title %q state %q err %v", got.Title, got.Metadata.Lookup, err)
	}
	if s.connectorRevision.Load() <= revision {
		t.Fatal("title update did not notify library")
	}
	if len(calls()) != 1 || calls()[0].Model != "deepseek-flash" {
		t.Fatalf("unexpected calls: %+v", calls())
	}
	request(t, s, "PATCH", "/api/documents/"+d.ID, strings.NewReader(`{"title":"Manual title"}`))
	got, err = s.autoPaperLookup(context.Background(), d.ID)
	if err != nil || got.Title != "Manual title" {
		t.Fatalf("manual title overwritten: %q %v", got.Title, err)
	}
}

func TestAutoPaperTitleSkipsUnconfiguredAI(t *testing.T) {
	s := testServer(t)
	temp := t.TempDir()
	node := filepath.Join(temp, "node")
	script := "#!/bin/sh\nprintf '%s' '{\"metadata\":{},\"pages\":[\"Paper text\"]}' > \"$5\"\n"
	if err := os.WriteFile(node, []byte(script), 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("NEOREAD_NODE", node)
	t.Setenv("NEOREAD_PROCESSOR", filepath.Join(temp, "main.mjs"))
	w := uploadTo(t, s, "papers", "random.pdf", testPDF(1))
	var d Document
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	got, err := s.autoPaperLookup(context.Background(), d.ID)
	if err != errNoIdentifier || got.Title != "random" {
		t.Fatalf("got %q, %v", got.Title, err)
	}
}

func TestExtractedTitleLooksUpPaperMetadata(t *testing.T) {
	s := testServer(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("query") != "A Reliable Paper Title" {
			t.Errorf("unexpected query %q", r.URL.RawQuery)
		}
		_, _ = w.Write([]byte(`{"data":[{"title":"A Reliable Paper Title","venue":"Example Journal","authors":[{"name":"Alex Smith"}]}]}`))
	}))
	defer server.Close()
	client := scholar.New(maxImportBytes)
	client.AllowPrivateHosts = true
	client.SemanticScholar = server.URL + "/"
	s.scholar = client
	w := uploadTo(t, s, "papers", "random.pdf", testPDF(1))
	var d Document
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	got, err := s.lookupExtractedTitle(context.Background(), d.ID, "A Reliable Paper Title", "ai")
	if err != nil || got.Metadata.Venue != "Example Journal" || got.Metadata.Lookup != "done" {
		t.Fatalf("metadata lookup: %+v %v", got.Metadata, err)
	}
}
