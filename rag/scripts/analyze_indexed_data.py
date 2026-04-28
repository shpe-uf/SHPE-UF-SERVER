"""
Analyze the current RAG indexed data to identify noise and quality issues.

Usage (run from project root):
    python rag/scripts/analyze_indexed_data.py
"""

import chromadb
from collections import defaultdict
import re
from typing import List, Dict
import json
import os

class IndexAnalyzer:
    def __init__(self):
        # Ensure DB folder exists (no-op if it does)
        os.makedirs("./rag/chroma_db", exist_ok=True)

        # Initialize chroma client with error handling
        try:
            self.chroma_client = chromadb.PersistentClient(path="./rag/chroma_db")
        except Exception as e:
            print(f"Error: failed to initialize ChromaDB client: {e}")
            exit(1)

        # Try to get the collection; if missing, show available collections
        try:
            self.collection = self.chroma_client.get_collection("website_docs")
        except Exception as e:
            available = []
            try:
                # list_collections may return objects — be defensive
                raw = self.chroma_client.list_collections()
                for c in raw:
                    # support both dict-like and object with name
                    if isinstance(c, dict) and 'name' in c:
                        available.append(c['name'])
                    elif hasattr(c, 'name'):
                        available.append(getattr(c, 'name'))
                    else:
                        available.append(str(c))
            except Exception:
                # ignore list_collections errors, keep available empty
                pass

            print(f"Error: 'website_docs' collection not found in ChromaDB. ({e})")
            if available:
                print(f"Available collections: {available}")
            else:
                print("No collections found in ChromaDB.")
            exit(1)

    def get_all_chunks(self) -> Dict:
        """Retrieve all indexed chunks with their metadata"""
        # Retrieve documents and metadatas; be resilient to API errors and missing keys
        try:
            websites = self.collection.get(include=['documents', 'metadatas'])
        except Exception as e:
            print(f"Warning: failed to fetch collection data: {e}")
            return {'documents': [], 'metadatas': []}

        # Ensure keys exist and are lists
        documents = websites.get('documents') if isinstance(websites, dict) else None
        metadatas = websites.get('metadatas') if isinstance(websites, dict) else None

        if not isinstance(documents, list):
            documents = []
        if not isinstance(metadatas, list):
            metadatas = []

        return {
            'documents': documents,
            'metadatas': metadatas
        }

    def detect_noise_patterns(self, chunks: List[str]) -> Dict:
        """Detect common noise patterns in chunks"""
        noise_indicators = {
            'navigation_keywords': ['menu', 'home', 'about', 'contact', 'login', 'sign up', 'click here'],
            'social_media': ['facebook', 'twitter', 'instagram', 'linkedin', 'follow us', 'share'],
            'cookie_banners': ['cookie', 'privacy policy', 'accept', 'decline', 'gdpr'],
            'form_elements': ['submit', 'email address', 'enter your', 'subscribe', 'newsletter'],
            'generic_phrases': ['welcome to', 'copyright', 'all rights reserved', '©'],
        }

        noise_stats = defaultdict(list)

        for i, chunk in enumerate(chunks):
            chunk_lower = chunk.lower()

            for category, keywords in noise_indicators.items():
                matches = [kw for kw in keywords if kw in chunk_lower]
                if matches:
                    noise_stats[category].append({
                        'chunk_index': i,
                        'matches': matches,
                        'preview': chunk[:200] + '...' if len(chunk) > 200 else chunk
                    })

        return noise_stats

    def analyze_chunk_quality(self, chunks: List[str]) -> Dict:
        """Analyze overall chunk quality metrics"""
        word_counts = [len(chunk.split()) for chunk in chunks]
        char_counts = [len(chunk) for chunk in chunks]

        # Find very short chunks (likely noise)
        short_chunks = [(i, chunk) for i, chunk in enumerate(chunks) if len(chunk.split()) < 20]

        # Find chunks with high punctuation/word ratio (likely menus/navigation)
        noisy_chunks = []
        for i, chunk in enumerate(chunks):
            words = len(chunk.split())
            if words > 0:
                punct_ratio = len(re.findall(r'[^\w\s]', chunk)) / words
                if punct_ratio > 0.5:  # More than 50% punctuation
                    noisy_chunks.append((i, chunk[:200], punct_ratio))

        return {
            'total_chunks': len(chunks),
            'avg_words_per_chunk': sum(word_counts) / len(word_counts) if word_counts else 0,
            'avg_chars_per_chunk': sum(char_counts) / len(char_counts) if char_counts else 0,
            'short_chunks_count': len(short_chunks),
            'short_chunks_sample': short_chunks[:5],  # Show first 5
            'high_punctuation_count': len(noisy_chunks),
            'high_punctuation_sample': noisy_chunks[:5],
        }

    def analyze_by_url(self, metadatas: List[Dict]) -> Dict:
        """Analyze chunks grouped by source URL"""
        url_stats = defaultdict(lambda: {'count': 0, 'titles': set()})

        for meta in metadatas:
            url = meta.get('url', 'unknown')
            title = meta.get('title', 'no title')
            url_stats[url]['count'] += 1
            url_stats[url]['titles'].add(title)

        # Convert to regular dict and clean up
        url_stats = {
            url: {
                'chunk_count': stats['count'],
                'titles': list(stats['titles'])
            }
            for url, stats in url_stats.items()
        }

        return url_stats

    def generate_report(self):
        """Generate comprehensive analysis report"""
        print("🔍 Analyzing RAG Index...\n")

        # Get all data
        all_data = self.get_all_chunks()
        chunks = all_data['documents']
        metadatas = all_data['metadatas']

        print(f"📊 Total indexed chunks: {len(chunks)}\n")

        # Quality analysis
        print("=" * 60)
        print("CHUNK QUALITY ANALYSIS")
        print("=" * 60)
        quality = self.analyze_chunk_quality(chunks)
        print(f"Average words per chunk: {quality['avg_words_per_chunk']:.1f}")
        print(f"Average characters per chunk: {quality['avg_chars_per_chunk']:.1f}")
        print(f"\n⚠️  Suspiciously short chunks (< 20 words): {quality['short_chunks_count']}")

        if quality['short_chunks_sample']:
            print("\nSample short chunks:")
            for i, chunk in quality['short_chunks_sample']:
                print(f"  [{i}] {chunk[:150]}...")

        print(f"\n⚠️  High punctuation chunks (likely menus): {quality['high_punctuation_count']}")
        if quality['high_punctuation_sample']:
            print("\nSample high-punctuation chunks:")
            for i, preview, ratio in quality['high_punctuation_sample']:
                print(f"  [{i}] (punct ratio: {ratio:.2f}) {preview}...")

        # Noise detection
        print("\n" + "=" * 60)
        print("NOISE PATTERN DETECTION")
        print("=" * 60)
        noise = self.detect_noise_patterns(chunks)

        for category, occurrences in noise.items():
            print(f"\n{category.upper().replace('_', ' ')}: {len(occurrences)} chunks affected")
            if occurrences:
                print(f"  Example: {occurrences[0]['preview'][:150]}...")

        # URL breakdown
        print("\n" + "=" * 60)
        print("CHUNKS BY SOURCE URL")
        print("=" * 60)
        url_stats = self.analyze_by_url(metadatas)

        for url, stats in sorted(url_stats.items(), key=lambda x: x[1]['chunk_count'], reverse=True):
            print(f"\n{url}")
            print(f"  Chunks: {stats['chunk_count']}")
            print(f"  Title: {stats['titles'][0] if stats['titles'] else 'N/A'}")

        # Save detailed report
        report_data = {
            'quality_metrics': quality,
            'noise_patterns': {k: len(v) for k, v in noise.items()},
            'url_breakdown': url_stats,
            'total_chunks': len(chunks)
        }

        with open('rag/analysis_report.json', 'w') as f:
            json.dump(report_data, f, indent=2, default=str)

        print("\n" + "=" * 60)
        print(f"✅ Full report saved to: rag/analysis_report.json")
        print("=" * 60)

if __name__ == "__main__":
    analyzer = IndexAnalyzer()
    analyzer.generate_report()
