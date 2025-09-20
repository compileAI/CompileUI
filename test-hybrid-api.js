#!/usr/bin/env node

/**
 * API-based test script for hybrid search functionality
 * 
 * This script tests the hybrid search by making API calls to the server.
 * It requires the Next.js development server to be running.
 * 
 * Usage:
 * 1. Start your Next.js dev server: npm run dev
 * 2. Run this test: node test-hybrid-api.js [options]
 * 
 * Options:
 *   --dense-only    Test only dense search
 *   --sparse-only   Test only sparse search  
 *   --hybrid-only   Test only hybrid search
 *   --all           Test all three methods (default)
 *   --query "text"  Use custom query instead of default
 *   --limit N       Number of results to fetch (default: 5)
 *   --help          Show this help message
 * 
 * Examples:
 *   node test-hybrid-api.js --sparse-only
 *   node test-hybrid-api.js --dense-only --query "artificial intelligence"
 *   node test-hybrid-api.js --hybrid-only --limit 10
 */

const API_BASE_URL = 'http://localhost:3000';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'all', // 'dense-only', 'sparse-only', 'hybrid-only', 'all'
    query: null, // Will use default if not specified
    limit: 5,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dense-only':
        options.mode = 'dense-only';
        break;
      case '--sparse-only':
        options.mode = 'sparse-only';
        break;
      case '--hybrid-only':
        options.mode = 'hybrid-only';
        break;
      case '--all':
        options.mode = 'all';
        break;
      case '--query':
        if (i + 1 < args.length) {
          options.query = args[i + 1];
          i++; // Skip next argument
        } else {
          console.error('❌ --query requires a value');
          process.exit(1);
        }
        break;
      case '--limit':
        if (i + 1 < args.length) {
          const limit = parseInt(args[i + 1]);
          if (isNaN(limit) || limit < 1) {
            console.error('❌ --limit must be a positive number');
            process.exit(1);
          }
          options.limit = limit;
          i++; // Skip next argument
        } else {
          console.error('❌ --limit requires a number');
          process.exit(1);
        }
        break;
      case '--help':
        options.help = true;
        break;
      default:
        console.error(`❌ Unknown option: ${arg}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🔍 Hybrid Search Test Script

Usage: node test-hybrid-api.js [options]

Options:
  --dense-only    Test only dense vector search
  --sparse-only   Test only sparse BM25 search  
  --hybrid-only   Test only hybrid search (dense + sparse + RRF)
  --all           Test all three methods (default)
  --query "text"  Use custom query instead of default
  --limit N       Number of results to fetch (default: 5)
  --help          Show this help message

Examples:
  node test-hybrid-api.js --sparse-only
  node test-hybrid-api.js --dense-only --query "artificial intelligence"
  node test-hybrid-api.js --hybrid-only --limit 10
  node test-hybrid-api.js --all --query "machine learning healthcare"

Prerequisites:
  1. Start your Next.js dev server: npm run dev
  2. Ensure environment variables are set (PINECONE_*, GOOGLE_API_KEY)
`);
}

async function makeSearchRequest(query, searchType = 'dense', limit = 5) {
  try {
    console.log(`   🔄 Making ${searchType} search request...`);
    
    const requestBody = { query, limit };
    
    switch (searchType) {
      case 'dense':
        // Default behavior - no additional params needed
        break;
      case 'sparse':
        requestBody.use_sparse_only = true;
        break;
      case 'hybrid':
        requestBody.use_hybrid_search = true;
        break;
      default:
        throw new Error(`Unknown search type: ${searchType}`);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return null;
  }
}

function formatArticle(article, index) {
  const dateStr = new Date(article.date).toISOString().split('T')[0];
  return `${index + 1}. [${article.article_id}] ${article.title}
     📅 ${dateStr} | 📚 ${article.citations.length} citations
     📄 ${article.content.substring(0, 100)}...`;
}

function printResults(method, results, query, executionTime) {
  console.log(`\n${'='.repeat(120)}`);
  console.log(`🔍 ${method.toUpperCase()} SEARCH RESULTS`);
  console.log(`Query: "${query}"`);
  console.log(`⏱️  Execution Time: ${executionTime}ms`);
  console.log(`📊 Articles found: ${results.length}`);
  console.log(`${'='.repeat(120)}`);
  
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
  console.log(`\n${'='.repeat(120)}`);
  console.log('📊 COMPREHENSIVE SEARCH ANALYSIS');
  console.log(`${'='.repeat(120)}`);
  
  const denseIds = denseResults.map(a => a.article_id);
  const sparseIds = sparseResults.map(a => a.article_id);
  const hybridIds = hybridResults.map(a => a.article_id);
  
  // Find all overlaps
  const denseSparseOverlap = denseIds.filter(id => sparseIds.includes(id));
  const denseHybridOverlap = denseIds.filter(id => hybridIds.includes(id));
  const sparseHybridOverlap = sparseIds.filter(id => hybridIds.includes(id));
  const allThreeOverlap = denseIds.filter(id => sparseIds.includes(id) && hybridIds.includes(id));
  
  // Find unique to each method
  const denseOnly = denseIds.filter(id => !sparseIds.includes(id) && !hybridIds.includes(id));
  const sparseOnly = sparseIds.filter(id => !denseIds.includes(id) && !hybridIds.includes(id));
  const hybridOnly = hybridIds.filter(id => !denseIds.includes(id) && !sparseIds.includes(id));
  
  console.log(`📈 Result Counts:`);
  console.log(`   Dense search: ${denseResults.length} articles`);
  console.log(`   Sparse search: ${sparseResults.length} articles`);
  console.log(`   Hybrid search: ${hybridResults.length} articles`);
  
  console.log(`\n🔄 Overlap Analysis:`);
  console.log(`   Dense ∩ Sparse: ${denseSparseOverlap.length} articles`);
  console.log(`   Dense ∩ Hybrid: ${denseHybridOverlap.length} articles`);
  console.log(`   Sparse ∩ Hybrid: ${sparseHybridOverlap.length} articles`);
  console.log(`   All three methods: ${allThreeOverlap.length} articles`);
  
  console.log(`\n🎯 Unique Results:`);
  console.log(`   Only in Dense: ${denseOnly.length} articles`);
  console.log(`   Only in Sparse: ${sparseOnly.length} articles`);
  console.log(`   Only in Hybrid: ${hybridOnly.length} articles`);
  
  // Ranking analysis for overlapping articles
  if (denseSparseOverlap.length > 0) {
    console.log(`\n📊 Ranking Analysis (articles found by both Dense and Sparse):`);
    denseSparseOverlap.slice(0, 5).forEach(articleId => {
      const denseRank = denseIds.indexOf(articleId) + 1;
      const sparseRank = sparseIds.indexOf(articleId) + 1;
      const hybridRank = hybridIds.indexOf(articleId) + 1;
      
      const article = denseResults.find(a => a.article_id === articleId) || 
                     sparseResults.find(a => a.article_id === articleId);
      const title = article?.title.substring(0, 50) || 'Unknown';
      
      console.log(`   "${title}..."`);
      console.log(`     Dense(${denseRank}) | Sparse(${sparseRank}) | Hybrid(${hybridRank})`);
    });
  }
  
  // Show unique articles from each method
  if (denseOnly.length > 0) {
    console.log(`\n🔍 Articles unique to Dense search:`);
    denseOnly.slice(0, 2).forEach(articleId => {
      const article = denseResults.find(a => a.article_id === articleId);
      const title = article?.title.substring(0, 60) || 'Unknown';
      console.log(`   [${articleId}] ${title}...`);
    });
  }
  
  if (sparseOnly.length > 0) {
    console.log(`\n🔍 Articles unique to Sparse search:`);
    sparseOnly.slice(0, 2).forEach(articleId => {
      const article = sparseResults.find(a => a.article_id === articleId);
      const title = article?.title.substring(0, 60) || 'Unknown';
      console.log(`   [${articleId}] ${title}...`);
    });
  }
  
  if (hybridOnly.length > 0) {
    console.log(`\n🎯 Articles unique to Hybrid search (RRF benefit):`);
    hybridOnly.slice(0, 2).forEach(articleId => {
      const article = hybridResults.find(a => a.article_id === articleId);
      const title = article?.title.substring(0, 60) || 'Unknown';
      console.log(`   [${articleId}] ${title}...`);
    });
  }
  
  // RRF Effectiveness Analysis
  console.log(`\n🧠 RRF Fusion Analysis:`);
  
  if (allThreeOverlap.length > 0) {
    console.log(`   Articles ranked highly by all methods: ${allThreeOverlap.slice(0, 3).join(', ')}`);
    
    // Check if RRF is properly ranking overlapping articles higher
    const overlappingInHybridTop = allThreeOverlap.filter(id => {
      const denseRank = denseIds.indexOf(id) + 1;
      const sparseRank = sparseIds.indexOf(id) + 1;
      const hybridRank = hybridIds.indexOf(id) + 1;
      return hybridRank < Math.min(denseRank, sparseRank);
    });
    
    console.log(`   Articles ranked higher in hybrid due to RRF: ${overlappingInHybridTop.length}`);
  }
  
  // Effectiveness assessment
  console.log(`\n🎯 Search Method Effectiveness:`);
  
  const denseEffectiveness = denseOnly.length > 0 || denseSparseOverlap.length > 0;
  const sparseEffectiveness = sparseOnly.length > 0 || denseSparseOverlap.length > 0;
  const hybridEffectiveness = hybridOnly.length > 0 || 
                             (denseSparseOverlap.length > 0 && allThreeOverlap.length > 0);
  
  console.log(`   Dense search: ${denseEffectiveness ? '✅' : '⚠️'} ${denseOnly.length} unique + ${denseSparseOverlap.length} overlapping`);
  console.log(`   Sparse search: ${sparseEffectiveness ? '✅' : '⚠️'} ${sparseOnly.length} unique + ${denseSparseOverlap.length} overlapping`);
  console.log(`   Hybrid search: ${hybridEffectiveness ? '✅' : '⚠️'} ${hybridOnly.length} unique + combines both methods`);
  
  // Overall assessment
  const isHybridWorking = hybridOnly.length > 0 || 
                         (denseSparseOverlap.length > 0 && allThreeOverlap.some(id => {
                           const denseRank = denseIds.indexOf(id) + 1;
                           const sparseRank = sparseIds.indexOf(id) + 1;
                           const hybridRank = hybridIds.indexOf(id) + 1;
                           return hybridRank < Math.max(denseRank, sparseRank);
                         }));
  
  console.log(`\n🎯 Overall Assessment:`);
  console.log(`   ${isHybridWorking ? '✅ HYBRID SEARCH IS WORKING EFFECTIVELY' : '⚠️ HYBRID SEARCH NEEDS INVESTIGATION'}`);
  
  if (denseSparseOverlap.length === 0) {
    console.log(`   💡 Dense and Sparse searches found no common articles - this suggests they're finding very different content`);
  }
}

async function testServerConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vector-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', limit: 1 })
    });
    
    return response.ok || response.status === 400; // 400 is expected for invalid query
  } catch (error) {
    return false;
  }
}

async function runHybridSearchTest(options) {
  console.log('🚀 Starting Hybrid Search API Test');
  console.log(`🌐 Testing against: ${API_BASE_URL}`);
  console.log(`📋 Test Mode: ${options.mode}`);
  console.log(`📊 Result Limit: ${options.limit}`);
  
  // Test server connection
  console.log('\n🔌 Testing server connection...');
  const serverOnline = await testServerConnection();
  
  if (!serverOnline) {
    console.error('❌ Server is not responding. Please make sure your Next.js dev server is running:');
    console.error('   npm run dev');
    console.error('   or');
    console.error('   yarn dev');
    process.exit(1);
  }
  
  console.log('✅ Server is responding');
  
  // Test queries - using realistic AI/ML topics
  const testQueries = [
    "How does machine learning work in healthcare applications?",
    "What are the latest developments in artificial intelligence?",
    "How do neural networks process natural language?",
    "What is the impact of AI on cybersecurity and privacy?",
    "How does deep learning improve computer vision?"
  ];
  
  const primaryQuery = options.query || testQueries[0];
  
  console.log(`\n🎯 Test Query: "${primaryQuery}"`);
  console.log('This query tests both semantic understanding (ML concepts) and keyword matching (healthcare)');
  
  try {
    // Run tests based on mode
    if (options.mode === 'dense-only') {
      console.log('\n⏳ Running dense search test...');
      const startDense = Date.now();
      const denseResponse = await makeSearchRequest(primaryQuery, 'dense', options.limit);
      const denseTime = Date.now() - startDense;
      
      if (!denseResponse) {
        console.error('❌ Failed to get dense search results');
        return;
      }
      
      const denseResults = denseResponse.articles || [];
      printResults('Dense Vector Search', denseResults, primaryQuery, denseTime);
      
      if (denseResults.length === 0) {
        console.log('\n⚠️  No results returned from dense search');
      } else {
        console.log('\n✅ Dense search is working correctly');
      }
      
    } else if (options.mode === 'sparse-only') {
      console.log('\n⏳ Running sparse search test...');
      const startSparse = Date.now();
      const sparseResponse = await makeSearchRequest(primaryQuery, 'sparse', options.limit);
      const sparseTime = Date.now() - startSparse;
      
      if (!sparseResponse) {
        console.error('❌ Failed to get sparse search results');
        return;
      }
      
      const sparseResults = sparseResponse.articles || [];
      printResults('Sparse BM25 Search', sparseResults, primaryQuery, sparseTime);
      
      if (sparseResults.length === 0) {
        console.log('\n⚠️  No results returned from sparse search');
        console.log('   This could indicate:');
        console.log('   - BM25 parameters not found in database');
        console.log('   - Pinecone sparse index not accessible');
        console.log('   - No matching terms in the sparse index');
        console.log('   - Environment variables not set correctly');
      } else {
        console.log('\n✅ Sparse search is working correctly');
      }
      
    } else if (options.mode === 'hybrid-only') {
      console.log('\n⏳ Running hybrid search test...');
      const startHybrid = Date.now();
      const hybridResponse = await makeSearchRequest(primaryQuery, 'hybrid', options.limit);
      const hybridTime = Date.now() - startHybrid;
      
      if (!hybridResponse) {
        console.error('❌ Failed to get hybrid search results');
        return;
      }
      
      const hybridResults = hybridResponse.articles || [];
      printResults('Hybrid Search (Dense + Sparse + RRF)', hybridResults, primaryQuery, hybridTime);
      
      if (hybridResults.length === 0) {
        console.log('\n⚠️  No results returned from hybrid search');
      } else {
        console.log('\n✅ Hybrid search is working correctly');
      }
      
    } else {
      // options.mode === 'all' - run comprehensive comparison
      console.log('\n⏳ Running comprehensive comparison test...');
      
      // Run all three search types
      const startDense = Date.now();
      const denseResponse = await makeSearchRequest(primaryQuery, 'dense', options.limit);
      const denseTime = Date.now() - startDense;
      
      const startSparse = Date.now();
      const sparseResponse = await makeSearchRequest(primaryQuery, 'sparse', options.limit);
      const sparseTime = Date.now() - startSparse;
      
      const startHybrid = Date.now();
      const hybridResponse = await makeSearchRequest(primaryQuery, 'hybrid', options.limit);
      const hybridTime = Date.now() - startHybrid;
      
      if (!denseResponse || !sparseResponse || !hybridResponse) {
        console.error('❌ Failed to get search results');
        return;
      }
      
      const denseResults = denseResponse.articles || [];
      const sparseResults = sparseResponse.articles || [];
      const hybridResults = hybridResponse.articles || [];
      
      // Print results
      printResults('Dense Vector Search', denseResults, primaryQuery, denseTime);
      printResults('Sparse BM25 Search', sparseResults, primaryQuery, sparseTime);
      printResults('Hybrid Search (Dense + Sparse + RRF)', hybridResults, primaryQuery, hybridTime);
      
      // Analyze results
      analyzeResults(denseResults, sparseResults, hybridResults);
      
      // Performance comparison
      console.log(`\n${'='.repeat(120)}`);
      console.log('⏱️  PERFORMANCE COMPARISON');
      console.log(`${'='.repeat(120)}`);
      console.log(`Dense search: ${denseTime}ms`);
      console.log(`Sparse search: ${sparseTime}ms`);
      console.log(`Hybrid search: ${hybridTime}ms`);
      
      const totalSequential = denseTime + sparseTime;
      console.log(`\n📊 Performance Analysis:`);
      console.log(`   Sequential total (Dense + Sparse): ${totalSequential}ms`);
      console.log(`   Hybrid vs Sequential: ${hybridTime > totalSequential ? '+' : ''}${hybridTime - totalSequential}ms`);
      console.log(`   Hybrid efficiency: ${Math.round((totalSequential / hybridTime) * 100)}% of sequential time`);
      
      // Compare individual methods
      const fastestMethod = Math.min(denseTime, sparseTime, hybridTime);
      const slowestMethod = Math.max(denseTime, sparseTime, hybridTime);
      console.log(`   Fastest: ${fastestMethod}ms | Slowest: ${slowestMethod}ms | Range: ${slowestMethod - fastestMethod}ms`);
      
      // Test additional queries
      console.log(`\n${'='.repeat(120)}`);
      console.log('🔍 ADDITIONAL QUERY TESTS');
      console.log(`${'='.repeat(120)}`);
      
      for (let i = 1; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`\n📝 Testing: "${query}"`);
        
        try {
          const [denseResp, sparseResp, hybridResp] = await Promise.all([
            makeSearchRequest(query, 'dense', 3),
            makeSearchRequest(query, 'sparse', 3),
            makeSearchRequest(query, 'hybrid', 3)
          ]);
          
          if (denseResp && sparseResp && hybridResp) {
            const dense = denseResp.articles || [];
            const sparse = sparseResp.articles || [];
            const hybrid = hybridResp.articles || [];
            
            const denseIds = dense.map(a => a.article_id);
            const sparseIds = sparse.map(a => a.article_id);
            const hybridIds = hybrid.map(a => a.article_id);
            
            const denseSparseOverlap = denseIds.filter(id => sparseIds.includes(id)).length;
            const hybridUnique = hybridIds.filter(id => !denseIds.includes(id) && !sparseIds.includes(id)).length;
            
            console.log(`   📊 Results: Dense(${dense.length}) | Sparse(${sparse.length}) | Hybrid(${hybrid.length})`);
            console.log(`   🔄 Dense∩Sparse(${denseSparseOverlap}) | Hybrid unique(${hybridUnique})`);
            
            if (hybridUnique > 0) {
              console.log(`   ✅ Hybrid found ${hybridUnique} unique articles`);
            }
          }
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ API test completed successfully!`);
    console.log(`\n💡 Summary:`);
    console.log(`   - Dense search: Traditional semantic vector search using embeddings`);
    console.log(`   - Sparse search: Keyword-based BM25 search using term frequencies`);
    console.log(`   - Hybrid search: Combines dense + sparse + RRF fusion for best results`);
    console.log(`   - Look for unique articles in each method to verify they're working differently`);
    console.log(`   - Articles found by multiple methods should rank higher in hybrid results`);
    console.log(`   - Performance: Hybrid should be faster than running dense + sparse sequentially`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  runHybridSearchTest(options).catch(console.error);
}

module.exports = { runHybridSearchTest, makeSearchRequest, parseArgs, showHelp };
