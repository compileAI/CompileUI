# Hybrid Search Testing Guide

This guide explains how to test the new hybrid search functionality that combines dense vector search with sparse BM25 search using Reciprocal Rank Fusion (RRF).

## 🎯 What We're Testing

The hybrid search implementation includes:
- **Dense Search**: Traditional semantic vector search using embeddings
- **Sparse Search**: Keyword-based BM25 search using term frequencies
- **Hybrid Search**: Combines both methods using RRF fusion for better results

## 🧪 Test Scripts

### 1. Basic Function Tests (`test-search-functions.js`)
Tests that all functions can be imported and basic functionality works.

```bash
node test-search-functions.js
```

**What it tests:**
- Function imports (tokenize, BM25, RRF, vector search)
- Basic BM25 query vector construction
- RRF fusion algorithm with mock data
- Validates that overlapping articles get higher rankings

### 2. API Integration Test (`test-hybrid-api.js`)
Tests the actual API endpoint with real search queries.

```bash
# First, start your Next.js dev server
npm run dev

# Then run the API test (in another terminal)
node test-hybrid-api.js [options]
```

**Command Line Options:**
- `--dense-only` - Test only dense search
- `--sparse-only` - Test only sparse search  
- `--hybrid-only` - Test only hybrid search
- `--all` - Test all three methods (default)
- `--query "text"` - Use custom query instead of default
- `--limit N` - Number of results to fetch (default: 5)
- `--help` - Show help message

**Examples:**
```bash
# Test only sparse search (useful for debugging)
node test-hybrid-api.js --sparse-only

# Test dense search with custom query
node test-hybrid-api.js --dense-only --query "artificial intelligence"

# Test hybrid search with more results
node test-hybrid-api.js --hybrid-only --limit 10

# Test all methods (default behavior)
node test-hybrid-api.js
```

**What it tests:**
- Server connectivity
- **Dense vs Sparse vs Hybrid search comparison** (all three methods!)
- Performance timing for each search type
- Comprehensive result analysis and overlap detection
- Multiple query variations
- RRF fusion effectiveness
- **Individual method debugging** with specific flags

### 3. Direct Function Test (`test-hybrid-search-direct.js`)
Tests the search functions directly (requires compiled TypeScript).

```bash
# Compile TypeScript first
npx tsc

# Then run the direct test
node test-hybrid-search-direct.js
```

## 🔍 Test Queries

The tests use realistic AI/ML queries that a user might search:

1. **Primary**: "How does machine learning work in healthcare applications?"
2. **Secondary**: "What are the latest developments in artificial intelligence?"
3. **Additional**: Neural networks, cybersecurity, computer vision topics

These queries test both semantic understanding (ML concepts) and keyword matching (healthcare, AI).

## 📊 What to Look For

### ✅ Successful Hybrid Search Indicators:

1. **Unique Results**: Each method finds different articles not found by the others
2. **Different Rankings**: Articles appear in different positions across methods
3. **RRF Effectiveness**: Articles found by multiple methods rank higher in hybrid results
4. **Performance**: Hybrid search is faster than running dense + sparse sequentially
5. **Coverage**: Hybrid search provides the most comprehensive results

### 📈 Expected Results:

- **Dense Search**: Good at semantic similarity, finds conceptually related articles
- **Sparse Search**: Good at exact keyword matching, finds articles with specific terms
- **Hybrid Search**: Combines both strengths, ranks overlapping articles higher via RRF

## 🛠️ Environment Setup

Make sure these environment variables are set:

```bash
PINECONE_API_KEY=your_pinecone_key
PINECONE_DENSE_INDEX_NAME=scraped-sources-gemini
PINECONE_SPARSE_INDEX_NAME=genarticle-keyword-search
GOOGLE_API_KEY=your_google_ai_key
```

## 🐛 Troubleshooting

### Import Errors
If you get TypeScript import errors:
```bash
npx tsc  # Compile TypeScript files
```

### Server Connection Errors
Make sure your Next.js dev server is running:
```bash
npm run dev
```

### Sparse Search Not Working
If sparse search returns no results, try debugging:

```bash
# Test sparse search specifically
node test-hybrid-api.js --sparse-only

# Test with different queries
node test-hybrid-api.js --sparse-only --query "machine learning"
node test-hybrid-api.js --sparse-only --query "artificial intelligence"
```

**Common sparse search issues:**
1. **Environment Variables**: Check `PINECONE_SPARSE_INDEX_NAME` is set correctly
2. **BM25 Database**: Verify `bm25_terms` and `bm25_stats` tables exist in Supabase
3. **Pinecone Index**: Ensure sparse index exists and is accessible
4. **Tokenization**: Check if query tokens match those in the database
5. **Date Filtering**: Sparse results may be filtered out by date constraints

### No Results
If searches return empty results:
1. Check environment variables
2. Verify Pinecone indexes exist
3. Check Supabase connection
4. Look at server logs for errors
5. Try different queries with common terms

## 📝 Sample Output

```
🔍 DENSE VECTOR SEARCH RESULTS
Query: "How does machine learning work in healthcare applications?"
Articles found: 5

1. [12345] Machine Learning Applications in Medical Diagnosis
   📅 2024-01-15 | 📚 3 citations
   📄 Healthcare providers are increasingly adopting machine learning algorithms...

🔍 SPARSE BM25 SEARCH RESULTS
Query: "How does machine learning work in healthcare applications?"
Articles found: 5

1. [67890] Healthcare AI: Machine Learning in Clinical Practice
   📅 2024-01-12 | 📚 5 citations
   📄 Machine learning algorithms are transforming healthcare delivery...

🔍 HYBRID SEARCH (DENSE + SPARSE + RRF) RESULTS  
Query: "How does machine learning work in healthcare applications?"
Articles found: 5

1. [12345] Machine Learning Applications in Medical Diagnosis
   📅 2024-01-15 | 📚 3 citations
   📄 Healthcare providers are increasingly adopting machine learning algorithms...

📊 COMPREHENSIVE SEARCH ANALYSIS
   Dense ∩ Sparse: 2 articles
   All three methods: 1 articles
   Only in Dense: 2 articles
   Only in Sparse: 2 articles
   Only in Hybrid: 0 articles
   
🎯 Overall Assessment: ✅ HYBRID SEARCH IS WORKING EFFECTIVELY
```

## 🎉 Success Criteria

The hybrid search is working correctly if:
- ✅ Each search method returns different articles (dense ≠ sparse ≠ hybrid)
- ✅ Overlapping articles rank higher in hybrid results (RRF working)
- ✅ Hybrid search combines results from both dense and sparse methods
- ✅ Performance is reasonable (hybrid faster than sequential dense + sparse)
- ✅ No errors in server logs
- ✅ BM25 sparse search finds keyword-specific matches
- ✅ Dense search finds semantically similar content

Happy testing! 🚀
