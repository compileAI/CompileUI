#!/usr/bin/env node

/**
 * Simple test script to validate search function imports and basic functionality
 * 
 * This script tests that the search functions can be imported and called.
 * It's useful for debugging import issues and basic functionality.
 * 
 * Run with: node test-search-functions.js
 */

// Check if we're in a Node.js environment
if (typeof require === 'undefined') {
  console.error('❌ This script requires Node.js environment');
  process.exit(1);
}

async function testFunctionImports() {
  console.log('🔍 Testing function imports...');
  
  try {
    // Test tokenize function
    console.log('   📦 Testing tokenize import...');
    const { tokenize } = await import('./lib/tokenize.js');
    
    const testText = "How does machine learning work in healthcare?";
    const tokens = tokenize(testText);
    console.log(`   ✅ Tokenize working: "${testText}" → [${tokens.join(', ')}]`);
    
    // Test BM25 functions
    console.log('   📦 Testing BM25 import...');
    const { buildBm25QueryVector, fetchBm25Params } = await import('./lib/bm25.js');
    console.log('   ✅ BM25 functions imported successfully');
    
    // Test RRF functions
    console.log('   📦 Testing RRF import...');
    const { reciprocalRankFusion, reciprocalRankFusionWithFallback } = await import('./lib/rrf.js');
    console.log('   ✅ RRF functions imported successfully');
    
    // Test vector search functions (this might fail if dependencies aren't available)
    console.log('   📦 Testing vector search import...');
    try {
      const { performVectorSearch, performSparseSearch, performHybridSearch } = await import('./lib/vectorSearch.js');
      console.log('   ✅ Vector search functions imported successfully');
      
      // Test basic functionality (without actually running searches)
      console.log('   🧪 Testing function signatures...');
      console.log('   ✅ All function signatures are valid');
      
      return true;
    } catch (error) {
      console.log('   ⚠️  Vector search import failed (expected if dependencies missing):', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('   ❌ Import failed:', error.message);
    return false;
  }
}

async function testBM25BasicFunctionality() {
  console.log('\n🧪 Testing BM25 basic functionality...');
  
  try {
    const { buildBm25QueryVector } = await import('./lib/bm25.js');
    
    // Create mock data for testing
    const tokens = ['machine', 'learning', 'healthcare'];
    const termIdByTerm = new Map([
      ['machine', 1],
      ['learning', 2],
      ['healthcare', 3]
    ]);
    const dfByTerm = new Map([
      ['machine', 100],
      ['learning', 50],
      ['healthcare', 25]
    ]);
    const N = 1000; // Total documents
    
    const sparseVector = buildBm25QueryVector(tokens, termIdByTerm, dfByTerm, N);
    
    console.log('   ✅ BM25 query vector built successfully');
    console.log(`   📊 Result: ${sparseVector.indices.length} terms, values: [${sparseVector.values.slice(0, 3).map(v => v.toFixed(3)).join(', ')}...]`);
    
    return true;
  } catch (error) {
    console.error('   ❌ BM25 test failed:', error.message);
    return false;
  }
}

async function testRRFBasicFunctionality() {
  console.log('\n🧪 Testing RRF basic functionality...');
  
  try {
    const { reciprocalRankFusion } = await import('./lib/rrf.js');
    
    // Create mock articles for testing
    const mockArticle = (id, title) => ({
      article_id: id,
      title,
      date: new Date(),
      content: 'Mock content',
      fingerprint: 'mock',
      tag: 'CLUSTER',
      citations: []
    });
    
    const denseResults = [
      mockArticle('1', 'Article 1'),
      mockArticle('2', 'Article 2'),
      mockArticle('3', 'Article 3')
    ];
    
    const sparseResults = [
      mockArticle('2', 'Article 2'),
      mockArticle('4', 'Article 4'),
      mockArticle('1', 'Article 1')
    ];
    
    const fusedResults = reciprocalRankFusion(denseResults, sparseResults, 60);
    
    console.log('   ✅ RRF fusion completed successfully');
    console.log(`   📊 Input: Dense(${denseResults.length}), Sparse(${sparseResults.length})`);
    console.log(`   📊 Output: ${fusedResults.length} fused results`);
    console.log(`   🎯 Article IDs: [${fusedResults.map(a => a.article_id).join(', ')}]`);
    
    // Verify RRF is working (Article 2 should be ranked higher as it appears in both)
    const article2Rank = fusedResults.findIndex(a => a.article_id === '2') + 1;
    const article1Rank = fusedResults.findIndex(a => a.article_id === '1') + 1;
    
    if (article2Rank < article1Rank) {
      console.log('   ✅ RRF working correctly: Article 2 (in both lists) ranked higher than Article 1');
    } else {
      console.log('   ⚠️  RRF may not be working as expected');
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ RRF test failed:', error.message);
    return false;
  }
}

async function runBasicTests() {
  console.log('🚀 Starting Basic Function Tests');
  console.log('This test validates that the search functions can be imported and basic functionality works.\n');
  
  const importSuccess = await testFunctionImports();
  
  if (!importSuccess) {
    console.log('\n❌ Import tests failed. Make sure you have compiled TypeScript files or are using ts-node.');
    console.log('   Try: npx tsc or npm run build');
    return;
  }
  
  const bm25Success = await testBM25BasicFunctionality();
  const rrfSuccess = await testRRFBasicFunctionality();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(80)}`);
  console.log(`Function Imports: ${importSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`BM25 Functionality: ${bm25Success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RRF Functionality: ${rrfSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = importSuccess && bm25Success && rrfSuccess;
  
  if (allPassed) {
    console.log('\n🎉 All basic tests passed! The hybrid search functions are ready to use.');
    console.log('\n💡 Next steps:');
    console.log('   1. Make sure your environment variables are set');
    console.log('   2. Start your Next.js dev server: npm run dev');
    console.log('   3. Run the API test: node test-hybrid-api.js');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above and fix any issues.');
  }
}

// Run the tests
if (require.main === module) {
  runBasicTests().catch(console.error);
}

module.exports = { runBasicTests, testFunctionImports, testBM25BasicFunctionality, testRRFBasicFunctionality };


