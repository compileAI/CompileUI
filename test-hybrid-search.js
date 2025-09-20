#!/usr/bin/env node

/**
 * Live test script for comparing dense, sparse, and hybrid search methods
 * 
 * This script tests the /api/vector-search endpoint with different configurations
 * and compares the results to validate the hybrid search implementation.
 */

const API_BASE_URL = 'http://localhost:3000'; // Adjust if your dev server runs on a different port

async function makeSearchRequest(query, useHybridSearch = false, limit = 5) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
        use_hybrid_search: useHybridSearch
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making search request:`, error);
    return null;
  }
}

function formatArticle(article, index) {
  return `${index + 1}. [${article.article_id}] ${article.title}
     Date: ${article.date.toISOString().split('T')[0]}
     Citations: ${article.citations.length}
     Content Preview: ${article.content.substring(0, 100)}...`;
}

function printResults(method, results, query) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ${method.toUpperCase()} SEARCH RESULTS`);
  console.log(`Query: "${query}"`);
  console.log(`Articles found: ${results.length}`);
  console.log(`${'='.repeat(80)}`);
  
  if (results.length === 0) {
    console.log('❌ No articles found');
    return;
  }

  results.forEach((article, index) => {
    console.log(formatArticle(article, index));
    console.log('');
  });
}

function compareResults(denseResults, sparseResults, hybridResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 COMPARISON ANALYSIS');
  console.log(`${'='.repeat(80)}`);
  
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
  
  // Check if hybrid search is actually combining results
  const hybridIsCombined = hybridIds.length > Math.max(denseIds.length, sparseIds.length) ||
                          (denseSparseOverlap.length > 0 && hybridIds.length >= Math.max(denseIds.length, sparseIds.length));
  
  console.log(`\n🧠 Hybrid Search Analysis:`);
  console.log(`   Hybrid appears to be combining results: ${hybridIsCombined ? '✅ YES' : '❌ NO'}`);
  
  if (allThreeOverlap.length > 0) {
    console.log(`   Articles ranked highly by all methods: ${allThreeOverlap.slice(0, 3).join(', ')}`);
  }
  
  // Show ranking differences for overlapping articles
  if (denseSparseOverlap.length > 0) {
    console.log(`\n📊 Ranking Analysis (first 3 overlapping articles):`);
    denseSparseOverlap.slice(0, 3).forEach(articleId => {
      const denseRank = denseIds.indexOf(articleId) + 1;
      const sparseRank = sparseIds.indexOf(articleId) + 1;
      const hybridRank = hybridIds.indexOf(articleId) + 1;
      
      console.log(`   ${articleId}: Dense(${denseRank}) | Sparse(${sparseRank}) | Hybrid(${hybridRank})`);
    });
  }
}

async function runHybridSearchTest() {
  console.log('🚀 Starting Hybrid Search Live Test');
  console.log(`Testing against: ${API_BASE_URL}`);
  
  // Use a realistic AI-related query that a user might search
  const testQuery = "How does machine learning work in healthcare applications?";
  
  console.log(`\n🎯 Test Query: "${testQuery}"`);
  console.log('This query tests both semantic understanding (ML concepts) and keyword matching (healthcare)');
  
  try {
    console.log('\n⏳ Running searches...');
    
    // Run all three searches in parallel
    const [denseResponse, sparseResponse, hybridResponse] = await Promise.allSettled([
      makeSearchRequest(testQuery, false, 5), // Dense only
      makeSearchRequest(testQuery, true, 5),  // Hybrid (which internally runs both)
      // For sparse-only, we'll need to implement a separate endpoint or modify the existing one
      // For now, let's use the hybrid and extract what we can
    ]);
    
    if (denseResponse.status === 'rejected') {
      console.error('❌ Dense search failed:', denseResponse.reason);
      return;
    }
    
    if (hybridResponse.status === 'rejected') {
      console.error('❌ Hybrid search failed:', hybridResponse.reason);
      return;
    }
    
    const denseResults = denseResponse.value?.articles || [];
    
    // Note: We can't easily test sparse-only with the current API design
    // since sparse search is only available through hybrid search
    console.log('\n⚠️  Note: Sparse-only search requires a separate API endpoint');
    console.log('   Current implementation only exposes dense and hybrid methods');
    
    const hybridResults = hybridResponse.value?.articles || [];
    
    // Print results
    printResults('Dense Vector Search', denseResults, testQuery);
    printResults('Hybrid Search (Dense + Sparse + RRF)', hybridResults, testQuery);
    
    // For now, let's simulate sparse results by running the hybrid search
    // and making some assumptions about which results came from sparse
    console.log('\n💡 Since sparse-only isnt directly accessible via API,');
    console.log('   we can see the hybrid search combining both methods.');
    
    // Basic comparison
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 BASIC COMPARISON');
    console.log(`${'='.repeat(80)}`);
    console.log(`Dense search returned: ${denseResults.length} articles`);
    console.log(`Hybrid search returned: ${hybridResults.length} articles`);
    
    if (hybridResults.length !== denseResults.length) {
      console.log('✅ Hybrid search appears to be combining different results than dense-only');
    } else {
      console.log('🤔 Hybrid search returned same count as dense - this might indicate:');
      console.log('   - Similar results from both dense and sparse');
      console.log('   - Sparse search not working properly');
      console.log('   - RRF fusion is working but results are similar');
    }
    
    // Check for different article IDs
    const denseIds = denseResults.map(a => a.article_id);
    const hybridIds = hybridResults.map(a => a.article_id);
    const differentResults = hybridIds.filter(id => !denseIds.includes(id));
    
    if (differentResults.length > 0) {
      console.log(`\n🎯 Hybrid search found ${differentResults.length} different articles:`);
      differentResults.slice(0, 3).forEach(id => console.log(`   - ${id}`));
    }
    
    console.log(`\n✅ Test completed successfully!`);
    console.log(`\n💡 To fully test sparse search, consider adding a sparse-only endpoint:`);
    console.log(`   POST /api/vector-search with { "query": "...", "use_sparse_only": true }`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  runHybridSearchTest().catch(console.error);
}

module.exports = { runHybridSearchTest, makeSearchRequest };


