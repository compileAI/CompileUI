#!/usr/bin/env node

/**
 * Direct test script for hybrid search functionality
 * 
 * This script directly imports and tests the search functions
 * to compare dense, sparse, and hybrid search results.
 * 
 * Run with: node test-hybrid-search-direct.js
 */

// Mock environment variables for testing
process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'test-key';
process.env.PINECONE_DENSE_INDEX_NAME = process.env.PINECONE_DENSE_INDEX_NAME || 'scraped-sources-gemini';
process.env.PINECONE_SPARSE_INDEX_NAME = process.env.PINECONE_SPARSE_INDEX_NAME || 'genarticle-keyword-search';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-key';

// Import the search functions
// Note: This requires the TypeScript files to be compiled or using ts-node
async function importSearchFunctions() {
  try {
    // Try to import compiled JS files
    const { performVectorSearch, performSparseSearch, performHybridSearch } = await import('./lib/vectorSearch.js');
    return { performVectorSearch, performSparseSearch, performHybridSearch };
  } catch (error) {
    console.error('❌ Could not import search functions. Make sure TypeScript is compiled or use ts-node.');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function formatArticle(article, index) {
  return `${index + 1}. [${article.article_id}] ${article.title}
     Date: ${article.date.toISOString().split('T')[0]}
     Citations: ${article.citations.length}
     Content Preview: ${article.content.substring(0, 120)}...`;
}

function printResults(method, results, query, executionTime) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🔍 ${method.toUpperCase()} SEARCH RESULTS`);
  console.log(`Query: "${query}"`);
  console.log(`Execution Time: ${executionTime}ms`);
  console.log(`Articles found: ${results.length}`);
  console.log(`${'='.repeat(100)}`);
  
  if (results.length === 0) {
    console.log('❌ No articles found');
    return;
  }

  results.forEach((article, index) => {
    console.log(formatArticle(article, index));
    console.log('');
  });
}

function analyzeResults(denseResults, sparseResults, hybridResults) {
  console.log(`\n${'='.repeat(100)}`);
  console.log('📊 DETAILED COMPARISON ANALYSIS');
  console.log(`${'='.repeat(100)}`);
  
  // Extract article IDs for comparison
  const denseIds = denseResults.map(a => a.article_id);
  const sparseIds = sparseResults.map(a => a.article_id);
  const hybridIds = hybridResults.map(a => a.article_id);
  
  // Find overlaps
  const denseSparseOverlap = denseIds.filter(id => sparseIds.includes(id));
  const denseHybridOverlap = denseIds.filter(id => hybridIds.includes(id));
  const sparseHybridOverlap = sparseIds.filter(id => hybridIds.includes(id));
  const allThreeOverlap = denseIds.filter(id => sparseIds.includes(id) && hybridIds.includes(id));
  
  // Find unique to each method
  const uniqueToDense = denseIds.filter(id => !sparseIds.includes(id));
  const uniqueToSparse = sparseIds.filter(id => !denseIds.includes(id));
  const uniqueToHybrid = hybridIds.filter(id => !denseIds.includes(id) && !sparseIds.includes(id));
  
  console.log(`📈 Result Counts:`);
  console.log(`   Dense: ${denseResults.length} articles`);
  console.log(`   Sparse: ${sparseResults.length} articles`);
  console.log(`   Hybrid: ${hybridResults.length} articles`);
  
  console.log(`\n🔄 Overlaps:`);
  console.log(`   Dense ∩ Sparse: ${denseSparseOverlap.length} articles`);
  console.log(`   Dense ∩ Hybrid: ${denseHybridOverlap.length} articles`);
  console.log(`   Sparse ∩ Hybrid: ${sparseHybridOverlap.length} articles`);
  console.log(`   All three methods: ${allThreeOverlap.length} articles`);
  
  console.log(`\n🎯 Unique Results:`);
  console.log(`   Only in Dense: ${uniqueToDense.length} articles`);
  console.log(`   Only in Sparse: ${uniqueToSparse.length} articles`);
  console.log(`   Only in Hybrid: ${uniqueToHybrid.length} articles`);
  
  // RRF Effectiveness Analysis
  console.log(`\n🧠 RRF Fusion Analysis:`);
  
  if (allThreeOverlap.length > 0) {
    console.log(`   Articles ranked highly by all methods: ${allThreeOverlap.slice(0, 3).join(', ')}`);
    
    // Check if RRF is properly ranking overlapping articles higher
    const overlappingInHybridTop = allThreeOverlap.filter(id => 
      hybridIds.indexOf(id) < Math.min(denseIds.indexOf(id), sparseIds.indexOf(id))
    );
    
    console.log(`   Articles ranked higher in hybrid due to RRF: ${overlappingInHybridTop.length}`);
  }
  
  // Show ranking differences for overlapping articles
  if (denseSparseOverlap.length > 0) {
    console.log(`\n📊 Ranking Analysis (overlapping articles):`);
    denseSparseOverlap.slice(0, 5).forEach(articleId => {
      const denseRank = denseIds.indexOf(articleId) + 1;
      const sparseRank = sparseIds.indexOf(articleId) + 1;
      const hybridRank = hybridIds.indexOf(articleId) + 1;
      
      const denseTitle = denseResults.find(a => a.article_id === articleId)?.title.substring(0, 50) || 'N/A';
      
      console.log(`   "${denseTitle}..."`);
      console.log(`     Dense(${denseRank}) | Sparse(${sparseRank}) | Hybrid(${hybridRank})`);
    });
  }
  
  // Effectiveness metrics
  const hybridUniqueCount = uniqueToHybrid.length;
  const hybridImprovement = hybridUniqueCount > 0 ? '✅' : '⚠️';
  
  console.log(`\n🎯 Hybrid Search Effectiveness:`);
  console.log(`   ${hybridImprovement} Found ${hybridUniqueCount} unique articles not in either individual method`);
  console.log(`   ${denseSparseOverlap.length > 0 ? '✅' : '⚠️'} ${denseSparseOverlap.length} articles found by both dense and sparse`);
  console.log(`   ${hybridIds.length >= Math.max(denseIds.length, sparseIds.length) ? '✅' : '⚠️'} Hybrid returned ${hybridIds.length >= Math.max(denseIds.length, sparseIds.length) ? 'at least as many' : 'fewer'} results than individual methods`);
}

async function runDirectHybridSearchTest() {
  console.log('🚀 Starting Direct Hybrid Search Test');
  console.log('Testing search functions directly...');
  
  // Test with multiple realistic queries
  const testQueries = [
    "How does machine learning work in healthcare applications?",
    "What are the latest developments in artificial intelligence?",
    "How do neural networks process natural language?",
    "What is the impact of AI on cybersecurity?"
  ];
  
  const testQuery = testQueries[0]; // Use the first query for detailed analysis
  
  console.log(`\n🎯 Primary Test Query: "${testQuery}"`);
  console.log('This query tests both semantic understanding (ML concepts) and keyword matching (healthcare)');
  
  try {
    const { performVectorSearch, performSparseSearch, performHybridSearch } = await importSearchFunctions();
    
    console.log('\n⏳ Running searches...');
    
    // Run all three searches with timing
    const startDense = Date.now();
    const denseResults = await performVectorSearch(testQuery, 5);
    const denseTime = Date.now() - startDense;
    
    const startSparse = Date.now();
    const sparseResults = await performSparseSearch(testQuery, 5);
    const sparseTime = Date.now() - startSparse;
    
    const startHybrid = Date.now();
    const hybridResults = await performHybridSearch(testQuery, 5);
    const hybridTime = Date.now() - startHybrid;
    
    // Print individual results
    printResults('Dense Vector Search', denseResults, testQuery, denseTime);
    printResults('Sparse BM25 Search', sparseResults, testQuery, sparseTime);
    printResults('Hybrid Search (RRF Fusion)', hybridResults, testQuery, hybridTime);
    
    // Detailed analysis
    analyzeResults(denseResults, sparseResults, hybridResults);
    
    // Performance comparison
    console.log(`\n${'='.repeat(100)}`);
    console.log('⏱️  PERFORMANCE COMPARISON');
    console.log(`${'='.repeat(100)}`);
    console.log(`Dense Search: ${denseTime}ms`);
    console.log(`Sparse Search: ${sparseTime}ms`);
    console.log(`Hybrid Search: ${hybridTime}ms`);
    console.log(`Total (if run sequentially): ${denseTime + sparseTime}ms`);
    console.log(`Hybrid efficiency: ${Math.round(((denseTime + sparseTime) / hybridTime) * 100)}% of sequential time`);
    
    // Test additional queries
    console.log(`\n${'='.repeat(100)}`);
    console.log('🔍 ADDITIONAL QUERY TESTS');
    console.log(`${'='.repeat(100)}`);
    
    for (let i = 1; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`\n📝 Testing: "${query}"`);
      
      try {
        const [dense, sparse, hybrid] = await Promise.all([
          performVectorSearch(query, 3),
          performSparseSearch(query, 3),
          performHybridSearch(query, 3)
        ]);
        
        console.log(`   Dense: ${dense.length} | Sparse: ${sparse.length} | Hybrid: ${hybrid.length}`);
        
        // Check if results are different
        const denseIds = dense.map(a => a.article_id);
        const sparseIds = sparse.map(a => a.article_id);
        const hybridIds = hybrid.map(a => a.article_id);
        
        const overlap = denseIds.filter(id => sparseIds.includes(id)).length;
        const hybridUnique = hybridIds.filter(id => !denseIds.includes(id) && !sparseIds.includes(id)).length;
        
        console.log(`   Overlap: ${overlap} | Hybrid unique: ${hybridUnique}`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Direct test completed successfully!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  runDirectHybridSearchTest().catch(console.error);
}

module.exports = { runDirectHybridSearchTest };


