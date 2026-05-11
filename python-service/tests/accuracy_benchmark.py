"""
Phase 2: Accuracy Benchmarking & Testing Framework

Runs accuracy tests against the DriveLegal LLM to validate 90%+ accuracy target.
"""

import json
import sys
import os
from typing import Dict, List, Tuple
from datetime import datetime
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from llm import generate_response
from search import search
from database import get_penalties, get_laws


class AccuracyBenchmark:
    """Comprehensive accuracy testing framework"""
    
    def __init__(self):
        self.results = {
            'total_questions': 0,
            'correct_answers': 0,
            'incorrect_answers': 0,
            'partial_answers': 0,
            'errors': 0,
            'by_category': {},
            'by_language': {},
            'by_state': {},
            'by_difficulty': {}
        }
        self.test_details = []
    
    def load_test_cases(self, filepath: str) -> List[Dict]:
        """Load test cases from JSON"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Combine main test cases + extended
        all_cases = data.get('test_cases', [])
        all_cases.extend(data.get('extended_test_cases', []))
        
        return all_cases
    
    def run_benchmark(self, test_filepath: str, output_filepath: str = None) -> Dict:
        """
        Run full accuracy benchmark.
        
        Args:
            test_filepath: Path to test_cases_phase2.json
            output_filepath: Where to save detailed results
            
        Returns:
            Accuracy report dictionary
        """
        print("\n" + "="*80)
        print("PHASE 2: ACCURACY BENCHMARKING")
        print("="*80)
        
        test_cases = self.load_test_cases(test_filepath)
        self.results['total_questions'] = len(test_cases)
        
        print(f"Testing {len(test_cases)} questions...\n")
        
        for idx, test_case in enumerate(test_cases):
            result = self._test_question(test_case)
            self._record_result(test_case, result)
            
            # Progress indicator
            if (idx + 1) % 10 == 0:
                print(f"  Completed: {idx + 1}/{len(test_cases)}")
        
        # Compute metrics
        report = self._compute_metrics()
        
        # Save results
        if output_filepath:
            with open(output_filepath, 'w') as f:
                json.dump({
                    'report': report,
                    'detailed_results': self.test_details
                }, f, indent=2)
            print(f"\n✓ Results saved to {output_filepath}")
        
        # Print summary
        self._print_summary(report)
        
        return report
    
    def _test_question(self, test_case: Dict) -> Dict:
        """Test a single question and return result"""
        try:
            question = test_case.get('question', '')
            state = test_case.get('state', 'Tamil Nadu')
            language = test_case.get('language', 'en')
            
            # First search for relevant laws (same as main pipeline)
            laws = search(question, top_k=3, state=state)
            if not laws:
                return {
                    'status': 'error',
                    'accuracy': 0,
                    'response': '',
                    'reason': f'No laws found for query: {question}'
                }
            
            # Generate response using the pipeline
            response = generate_response(question, laws, state, language)
            if response is None:
                return {
                    'status': 'error',
                    'accuracy': 0,
                    'response': '',
                    'reason': 'LLM model failed to generate response'
                }
            
            # Check accuracy against expected keywords
            accuracy_result = self._check_keyword_presence(response, test_case)
            
            return {
                'status': accuracy_result['status'],
                'accuracy': accuracy_result['accuracy'],
                'response': response,
                'reason': accuracy_result.get('reason', '')
            }
            
        except Exception as e:
            import traceback
            return {
                'status': 'error',
                'accuracy': 0,
                'response': '',
                'reason': f"Exception: {str(e)}\n{traceback.format_exc()}"
            }
    
    def _check_keyword_presence(self, response: str, test_case: Dict) -> Dict:
        """Check if expected keywords are present in response"""
        expected_keywords = test_case.get('expected_keywords', [])
        if not expected_keywords:
            return {'status': 'error', 'accuracy': 0, 'reason': 'No expected keywords defined'}
        
        response_lower = response.lower()
        found_keywords = []
        
        for keyword in expected_keywords:
            if isinstance(keyword, str):
                if keyword.lower() in response_lower:
                    found_keywords.append(keyword)
            elif isinstance(keyword, dict):
                # Handle keyword alternatives
                alternatives = keyword.get('or', [])
                found = any(alt.lower() in response_lower for alt in alternatives)
                if found:
                    found_keywords.append(keyword)
        
        total_keywords = len(expected_keywords)
        found_count = len(found_keywords)
        
        if found_count == total_keywords:
            return {'status': 'correct', 'accuracy': 100}
        elif found_count >= total_keywords * 0.5:
            accuracy = (found_count / total_keywords) * 100
            return {'status': 'partial', 'accuracy': round(accuracy, 1)}
        else:
            accuracy = (found_count / total_keywords) * 100
            return {'status': 'incorrect', 'accuracy': round(accuracy, 1)}
    
    def _record_result(self, test_case: Dict, result: Dict):
        """Record test result in internal tracking"""
        self.test_details.append({
            'question': test_case.get('question', ''),
            'category': test_case.get('category', ''),
            'state': test_case.get('state', ''),
            'language': test_case.get('language', ''),
            'difficulty': test_case.get('difficulty', ''),
            'status': result.get('status'),
            'accuracy': result.get('accuracy'),
            'response': result.get('response', ''),
            'reason': result.get('reason', '')
        })
        
        # Update counters
        status = result.get('status')
        if status == 'correct':
            self.results['correct_answers'] += 1
        elif status == 'partial':
            self.results['partial_answers'] += 1
        elif status == 'incorrect':
            self.results['incorrect_answers'] += 1
        elif status == 'error':
            self.results['errors'] += 1
    
    def _compute_metrics(self) -> Dict:
        """Compute accuracy metrics"""
        total = self.results['total_questions']
        if total == 0:
            return {'overall_accuracy_pct': 0, 'target_met': False}
        
        # Overall accuracy (correct + 0.5 * partial)
        correct_weighted = self.results['correct_answers'] + (self.results['partial_answers'] * 0.5)
        overall_accuracy = (correct_weighted / total) * 100
        
        # Category breakdown
        category_accuracy = {}
        for detail in self.test_details:
            cat = detail['category']
            if cat not in category_accuracy:
                category_accuracy[cat] = {'total': 0, 'correct': 0, 'partial': 0}
            
            category_accuracy[cat]['total'] += 1
            if detail['status'] == 'correct':
                category_accuracy[cat]['correct'] += 1
            elif detail['status'] == 'partial':
                category_accuracy[cat]['partial'] += 0.5
        
        for cat in category_accuracy:
            stats = category_accuracy[cat]
            category_accuracy[cat] = round((stats['correct'] + stats['partial']) / stats['total'] * 100, 1)
        
        # Language breakdown
        language_accuracy = {}
        for detail in self.test_details:
            lang = detail['language']
            if lang not in language_accuracy:
                language_accuracy[lang] = {'total': 0, 'correct': 0, 'partial': 0}
            
            language_accuracy[lang]['total'] += 1
            if detail['status'] == 'correct':
                language_accuracy[lang]['correct'] += 1
            elif detail['status'] == 'partial':
                language_accuracy[lang]['partial'] += 0.5
        
        for lang in language_accuracy:
            stats = language_accuracy[lang]
            language_accuracy[lang] = round((stats['correct'] + stats['partial']) / stats['total'] * 100, 1)
        
        # State breakdown
        state_accuracy = {}
        for detail in self.test_details:
            st = detail['state']
            if st not in state_accuracy:
                state_accuracy[st] = {'total': 0, 'correct': 0, 'partial': 0}
            
            state_accuracy[st]['total'] += 1
            if detail['status'] == 'correct':
                state_accuracy[st]['correct'] += 1
            elif detail['status'] == 'partial':
                state_accuracy[st]['partial'] += 0.5
        
        for st in state_accuracy:
            stats = state_accuracy[st]
            state_accuracy[st] = round((stats['correct'] + stats['partial']) / stats['total'] * 100, 1)
        
        # Difficulty breakdown
        difficulty_accuracy = {}
        for detail in self.test_details:
            diff = detail['difficulty']
            if diff not in difficulty_accuracy:
                difficulty_accuracy[diff] = {'total': 0, 'correct': 0, 'partial': 0}
            
            difficulty_accuracy[diff]['total'] += 1
            if detail['status'] == 'correct':
                difficulty_accuracy[diff]['correct'] += 1
            elif detail['status'] == 'partial':
                difficulty_accuracy[diff]['partial'] += 0.5
        
        for diff in difficulty_accuracy:
            stats = difficulty_accuracy[diff]
            difficulty_accuracy[diff] = round((stats['correct'] + stats['partial']) / stats['total'] * 100, 1)
        
        return {
            'total_questions': total,
            'correct_answers': self.results['correct_answers'],
            'partial_answers': self.results['partial_answers'],
            'incorrect_answers': self.results['incorrect_answers'],
            'errors': self.results['errors'],
            'overall_accuracy_pct': round(overall_accuracy, 2),
            'target_met': overall_accuracy >= 90,
            'by_category': category_accuracy,
            'by_language': language_accuracy,
            'by_state': state_accuracy,
            'by_difficulty': difficulty_accuracy
        }
    
    def _print_summary(self, report: Dict):
        """Print formatted summary"""
        print("\n" + "="*80)
        print("ACCURACY BENCHMARK RESULTS")
        print("="*80)
        
        print(f"\n📊 OVERALL ACCURACY: {report['overall_accuracy_pct']}%")
        print(f"   Target: 90% | Status: {'✅ PASS' if report['target_met'] else '❌ FAIL'}")
        
        print(f"\n📈 DETAILED BREAKDOWN:")
        print(f"   Correct:  {report['correct_answers']} / {report['total_questions']}")
        print(f"   Partial:  {report['partial_answers']}")
        print(f"   Incorrect: {report['incorrect_answers']}")
        print(f"   Errors:   {report['errors']}")
        
        print(f"\n🏷️ BY CATEGORY:")
        for cat, acc in sorted(report['by_category'].items()):
            status = "✓" if acc >= 90 else "✗"
            print(f"   {status} {cat}: {acc}%")
        
        print(f"\n🌍 BY LANGUAGE:")
        for lang, acc in sorted(report['by_language'].items()):
            status = "✓" if acc >= 85 else "✗"
            print(f"   {status} {lang}: {acc}%")
        
        print(f"\n🏛️ BY STATE:")
        for state, acc in sorted(report['by_state'].items()):
            status = "✓" if acc >= 85 else "✗"
            print(f"   {status} {state}: {acc}%")
        
        print(f"\n⭐ BY DIFFICULTY:")
        for diff, acc in sorted(report['by_difficulty'].items()):
            status = "✓" if acc >= 85 else "✗"
            print(f"   {status} {diff}: {acc}%")
        
        print("\n" + "="*80)


def run_phase2_benchmark():
    """Execute Phase 2 benchmarking"""
    benchmark = AccuracyBenchmark()
    
    test_filepath = os.path.join(
        os.path.dirname(__file__),
        'test_cases_phase2.json'
    )
    
    output_filepath = os.path.join(
        os.path.dirname(__file__),
        'accuracy_benchmark_results.json'
    )
    
    report = benchmark.run_benchmark(test_filepath, output_filepath)
    
    return report


if __name__ == '__main__':
    run_phase2_benchmark()
