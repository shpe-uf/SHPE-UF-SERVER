"""
Benchmark RAG retrieval quality with test queries.

This script tests the RAG system with predefined questions to measure:
1. Retrieval accuracy (are the right chunks being retrieved?)
2. Answer quality (is the LLM generating good responses?)
3. Response time

Usage:
    # Make sure RAG API is running first
    npm run serve:rag

    # Then run benchmark
    python rag/benchmark_queries.py

    # Or save results to compare later
    python rag/benchmark_queries.py > rag/benchmark_before.txt
"""

import requests
import time
import json
from typing import List, Dict
from datetime import datetime

RAG_API_URL = "http://localhost:8001"

# Test queries covering different topics
TEST_QUERIES = [
    {
        "question": "What is SHPE UF?",
        "category": "about",
        "expected_keywords": ["society", "hispanic", "professional", "engineers", "university", "florida"]
    },
    {
        "question": "How do I become a member?",
        "category": "membership",
        "expected_keywords": ["join", "member", "sign up", "register"]
    },
    {
        "question": "What events does SHPE UF host?",
        "category": "events",
        "expected_keywords": ["event", "meeting", "conference", "workshop"]
    },
    {
        "question": "Who are the sponsors?",
        "category": "sponsors",
        "expected_keywords": ["sponsor", "company", "partner", "support"]
    },
    {
        "question": "What is the executive board?",
        "category": "leadership",
        "expected_keywords": ["board", "executive", "president", "leadership"]
    },
    {
        "question": "How can I contact SHPE UF?",
        "category": "contact",
        "expected_keywords": ["contact", "email", "reach", "message"]
    }
]

class RAGBenchmark:
    def __init__(self):
        self.results = []

    def check_api_health(self) -> bool:
        """Verify RAG API is running"""
        try:
            response = requests.get(f"{RAG_API_URL}/health", timeout=5)
            return response.status_code == 200
        except:
            return False

    def query_rag(self, question: str) -> Dict:
        """Send query to RAG API and measure response time"""
        start_time = time.time()

        try:
            response = requests.post(
                f"{RAG_API_URL}/query",
                json={"question": question},
                timeout=30
            )
            response.raise_for_status()

            elapsed_time = time.time() - start_time

            return {
                "success": True,
                "answer": response.json().get("answer", ""),
                "response_time": elapsed_time,
                "error": None
            }
        except Exception as e:
            elapsed_time = time.time() - start_time
            return {
                "success": False,
                "answer": "",
                "response_time": elapsed_time,
                "error": str(e)
            }

    def evaluate_answer(self, answer: str, expected_keywords: List[str]) -> Dict:
        """Evaluate answer quality based on keyword presence"""
        answer_lower = answer.lower()

        matched_keywords = [kw for kw in expected_keywords if kw.lower() in answer_lower]
        match_rate = len(matched_keywords) / len(expected_keywords) if expected_keywords else 0

        # Check for common failure patterns
        failure_indicators = [
            "don't have enough information",
            "cannot answer",
            "error",
            "failed to generate"
        ]
        has_failure = any(indicator in answer_lower for indicator in failure_indicators)

        return {
            "matched_keywords": matched_keywords,
            "match_rate": match_rate,
            "has_failure_indicator": has_failure,
            "answer_length": len(answer.split())
        }

    def run_benchmark(self):
        """Run all test queries and collect results"""
        print("=" * 70)
        print(f"RAG BENCHMARKING - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)

        # Check API health
        print("\n🔍 Checking RAG API health...")
        if not self.check_api_health():
            print("❌ RAG API is not running! Start it with: npm run serve:rag")
            return

        print("✅ RAG API is healthy\n")

        # Run each test query
        for i, test in enumerate(TEST_QUERIES, 1):
            print(f"\n{'─' * 70}")
            print(f"Test {i}/{len(TEST_QUERIES)}: {test['category'].upper()}")
            print(f"{'─' * 70}")
            print(f"Question: {test['question']}")

            # Query RAG
            result = self.query_rag(test['question'])

            if not result['success']:
                print(f"\n❌ Query failed: {result['error']}")
                self.results.append({
                    **test,
                    "success": False,
                    "error": result['error']
                })
                continue

            # Evaluate answer
            evaluation = self.evaluate_answer(result['answer'], test['expected_keywords'])

            # Print results
            print(f"\n⏱️  Response time: {result['response_time']:.2f}s")
            print(f"\n📝 Answer ({evaluation['answer_length']} words):")
            print(f"{result['answer'][:300]}..." if len(result['answer']) > 300 else result['answer'])

            print(f"\n📊 Evaluation:")
            print(f"  • Keyword match rate: {evaluation['match_rate']:.0%}")
            print(f"  • Matched keywords: {', '.join(evaluation['matched_keywords']) if evaluation['matched_keywords'] else 'None'}")
            print(f"  • Failure indicator: {'Yes ⚠️' if evaluation['has_failure_indicator'] else 'No ✅'}")

            # Store results
            self.results.append({
                **test,
                "success": True,
                "answer": result['answer'],
                "response_time": result['response_time'],
                "evaluation": evaluation
            })

        # Summary statistics
        self.print_summary()
        self.save_results()

    def print_summary(self):
        """Print overall benchmark summary"""
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)

        successful = [r for r in self.results if r.get('success', False)]

        if not successful:
            print("❌ No successful queries")
            return

        avg_response_time = sum(r['response_time'] for r in successful) / len(successful)
        avg_match_rate = sum(r['evaluation']['match_rate'] for r in successful) / len(successful)
        failure_count = sum(1 for r in successful if r['evaluation']['has_failure_indicator'])

        print(f"\n📊 Overall Metrics:")
        print(f"  • Total queries: {len(TEST_QUERIES)}")
        print(f"  • Successful: {len(successful)}")
        print(f"  • Failed: {len(self.results) - len(successful)}")
        print(f"  • Avg response time: {avg_response_time:.2f}s")
        print(f"  • Avg keyword match rate: {avg_match_rate:.0%}")
        print(f"  • Queries with failure indicators: {failure_count}")

        # Category breakdown
        print(f"\n📋 By Category:")
        for test in TEST_QUERIES:
            result = next((r for r in self.results if r['question'] == test['question']), None)
            if result and result.get('success'):
                match_rate = result['evaluation']['match_rate']
                status = "✅" if match_rate > 0.5 else "⚠️"
                print(f"  {status} {test['category']}: {match_rate:.0%} match")

    def save_results(self):
        """Save detailed results to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"rag/benchmark_results_{timestamp}.json"

        with open(filename, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'results': self.results
            }, f, indent=2)

        print(f"\n💾 Detailed results saved to: {filename}")
        print("=" * 70)

if __name__ == "__main__":
    benchmark = RAGBenchmark()
    benchmark.run_benchmark()
