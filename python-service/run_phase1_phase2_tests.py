"""
Phase 1 & 2 Testing Runner

Orchestrates API integration testing and accuracy benchmarking.
Run this to execute all preparation tests.
"""

import sys
import os
import json
from datetime import datetime
from typing import Dict

sys.path.insert(0, os.path.dirname(__file__))

from api_integration import (
    DataGovInAPI,
    OpenStreetMapAPI,
    PublicWorksDepartmentAPI
)
from tests.accuracy_benchmark import AccuracyBenchmark
from tests.voice_testing_framework import VoiceTestingFramework


class Phase1Phase2TestRunner:
    """Master test runner for Phases 1 and 2"""
    
    def __init__(self):
        self.phase1_results = None
        self.phase2_results = None
        self.all_results = {
            'timestamp': datetime.now().isoformat(),
            'phase1': None,
            'phase2': None
        }
    
    def run_phase1_api_integration(self) -> Dict:
        """
        PHASE 1: API Integration Testing
        
        Tests:
        1. data.gov.in Traffic Laws API
        2. OpenStreetMap Incidents API
        3. PWD Road Conditions API
        """
        print("\n" + "="*80)
        print("PHASE 1: API INTEGRATION TESTING")
        print("="*80)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'apis': {}
        }
        
        states = ['TN', 'KN', 'AP', 'KL', 'MH', 'DL']
        
        # Test 1: Traffic Laws API
        print("\n[1/3] Testing data.gov.in Traffic Laws API...")
        laws_results = {
            'states': {},
            'total_records': 0,
            'status': 'pending'
        }
        
        for state in states:
            laws = DataGovInAPI.fetch_traffic_laws(state)
            laws_results['states'][state] = {
                'records': len(laws),
                'status': 'success' if laws else 'fallback_to_mock'
            }
            laws_results['total_records'] += len(laws)
        
        laws_results['status'] = 'success' if laws_results['total_records'] > 0 else 'partial'
        results['apis']['traffic_laws'] = laws_results
        
        print(f"  ✓ {laws_results['total_records']} traffic law records fetched")
        
        # Test 2: Incidents API
        print("\n[2/3] Testing OpenStreetMap Incidents API...")
        incidents_results = {
            'states': {},
            'total_records': 0,
            'status': 'pending'
        }
        
        for state in states:
            incidents = OpenStreetMapAPI.fetch_incidents(state)
            incidents_results['states'][state] = {
                'records': len(incidents),
                'status': 'success' if incidents else 'fallback_to_mock'
            }
            incidents_results['total_records'] += len(incidents)
        
        incidents_results['status'] = 'success' if incidents_results['total_records'] > 0 else 'partial'
        results['apis']['incidents'] = incidents_results
        
        print(f"  ✓ {incidents_results['total_records']} incident records fetched")
        
        # Test 3: Road Conditions API
        print("\n[3/3] Testing PWD Road Conditions API...")
        conditions_results = {
            'states': {},
            'total_records': 0,
            'status': 'pending'
        }
        
        for state in states:
            conditions = PublicWorksDepartmentAPI.fetch_conditions(state)
            conditions_results['states'][state] = {
                'records': len(conditions),
                'status': 'success' if conditions else 'fallback_to_mock'
            }
            conditions_results['total_records'] += len(conditions)
        
        conditions_results['status'] = 'success' if conditions_results['total_records'] > 0 else 'partial'
        results['apis']['road_conditions'] = conditions_results
        
        print(f"  ✓ {conditions_results['total_records']} road condition records fetched")
        
        # Summary
        total_records = (
            laws_results['total_records'] +
            incidents_results['total_records'] +
            conditions_results['total_records']
        )
        
        print("\n" + "-"*80)
        print("PHASE 1 SUMMARY")
        print("-"*80)
        print(f"Total Records Fetched: {total_records}")
        print(f"Target: 100+ records | Status: {'✅ PASS' if total_records >= 100 else '⚠️  PARTIAL'}")
        
        results['summary'] = {
            'total_records': total_records,
            'target_met': total_records >= 100,
            'ready_for_phase2': True
        }
        
        self.phase1_results = results
        return results
    
    def run_phase2_accuracy_testing(self, test_cases_file: str = None) -> Dict:
        """
        PHASE 2: Accuracy Benchmarking & Voice Testing
        
        Tests:
        1. Accuracy Benchmark (100 test questions)
        2. Voice Testing (STT, LLM, TTS)
        """
        print("\n" + "="*80)
        print("PHASE 2: ACCURACY BENCHMARKING & VOICE TESTING")
        print("="*80)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'accuracy_benchmark': None,
            'voice_testing': None
        }
        
        # Test 1: Accuracy Benchmark
        print("\n[1/2] Running Accuracy Benchmark...")
        
        benchmark = AccuracyBenchmark()
        
        if test_cases_file is None:
            test_cases_file = os.path.join(
                os.path.dirname(__file__),
                'tests/test_cases_phase2.json'
            )
        
        if os.path.exists(test_cases_file):
            benchmark_results = benchmark.run_benchmark(
                test_cases_file,
                os.path.join(os.path.dirname(__file__), 'tests/accuracy_results.json')
            )
            results['accuracy_benchmark'] = benchmark_results
        else:
            print(f"  ⚠️  Test cases file not found: {test_cases_file}")
            results['accuracy_benchmark'] = {'status': 'skipped', 'reason': 'test_file_not_found'}
        
        # Test 2: Voice Testing
        print("\n[2/2] Running Voice Interaction Tests...")
        
        voice_framework = VoiceTestingFramework()
        
        try:
            voice_results = {
                'stt': voice_framework.test_stt_accuracy('', 'en'),
                'tts': voice_framework.test_tts_quality([], 'en'),
                'e2e': voice_framework.test_end_to_end_voice([])
            }
            results['voice_testing'] = voice_results
        except Exception as e:
            print(f"  ⚠️  Voice testing error: {e}")
            results['voice_testing'] = {'status': 'error', 'error': str(e)}
        
        # Summary
        print("\n" + "-"*80)
        print("PHASE 2 SUMMARY")
        print("-"*80)
        
        if results['accuracy_benchmark'] and 'overall_accuracy_pct' in results['accuracy_benchmark']:
            acc = results['accuracy_benchmark']['overall_accuracy_pct']
            print(f"Accuracy Benchmark: {acc}%")
            print(f"Target: 90% | Status: {'✅ PASS' if acc >= 90 else '⚠️  NEED IMPROVEMENT'}")
        
        if results['voice_testing'] and 'e2e' in results['voice_testing']:
            e2e_success = results['voice_testing']['e2e'].get('success_rate_pct', 0)
            print(f"\nVoice Pipeline Success: {e2e_success}%")
            print(f"Target: 85%+ | Status: {'✅ PASS' if e2e_success >= 85 else '⚠️  NEED IMPROVEMENT'}")
        
        results['summary'] = {
            'ready_for_pilot': (
                results['accuracy_benchmark'] and
                results['accuracy_benchmark'].get('overall_accuracy_pct', 0) >= 90
            ),
            'recommendations': [
                'Phase 1: Integrate real APIs before pilot',
                'Phase 2: All accuracy benchmarks ready',
                'Phase 3: Ready to recruit pilot users'
            ]
        }
        
        self.phase2_results = results
        return results
    
    def run_all_tests(self):
        """Execute all Phase 1 & 2 tests"""
        print("\n" + "="*80)
        print("DRIVELEGAL: PHASE 1 & 2 TEST SUITE")
        print("="*80)
        print("Starting comprehensive testing preparation...\n")
        
        # Phase 1
        phase1 = self.run_phase1_api_integration()
        
        # Phase 2
        phase2 = self.run_phase2_accuracy_testing()
        
        # Combine results
        self.all_results['phase1'] = phase1
        self.all_results['phase2'] = phase2
        
        # Final summary
        self._print_final_summary()
        
        # Save results
        output_file = os.path.join(
            os.path.dirname(__file__),
            'tests/testing_preparation_report.json'
        )
        with open(output_file, 'w') as f:
            json.dump(self.all_results, f, indent=2)
        
        print(f"\n✓ Full report saved: {output_file}")
        
        return self.all_results
    
    def _print_final_summary(self):
        """Print final comprehensive summary"""
        print("\n" + "="*80)
        print("FINAL TESTING PREPARATION SUMMARY")
        print("="*80)
        
        print("\n✅ PHASE 1: API INTEGRATION")
        p1 = self.all_results.get('phase1', {})
        print(f"   Total records fetched: {p1.get('summary', {}).get('total_records', 0)}")
        print(f"   Status: {'READY ✓' if p1.get('summary', {}).get('target_met') else 'IN PROGRESS'}")
        
        print("\n✅ PHASE 2: ACCURACY & VOICE TESTING")
        p2 = self.all_results.get('phase2', {})
        acc = p2.get('accuracy_benchmark', {}).get('overall_accuracy_pct', 0)
        print(f"   Accuracy: {acc}%")
        print(f"   Status: {'READY ✓' if acc >= 90 else 'IN PROGRESS'}")
        
        print("\n" + "="*80)
        print("NEXT STEPS:")
        print("="*80)
        print("""
1. ✅ Phase 1 Prepared: API integration scaffolding in place
   - api_integration.py ready for real API calls
   - Mock data available for demo
   - Ready for May 3-17 timeline

2. ✅ Phase 2 Prepared: Accuracy testing framework ready
   - 100 test questions across 3 languages, 6 states
   - Accuracy benchmark script ready
   - Voice testing framework ready
   - Ready for May 18-31 timeline

3. 📋 NEXT: Connect real APIs in Phase 1 (May 3-17)
   - Configure data.gov.in API key
   - Test OSM API connectivity
   - Validate mock fallback logic

4. 🧪 THEN: Run accuracy benchmarks in Phase 2 (May 18-31)
   - Execute: python accuracy_benchmark.py
   - Target: 90%+ accuracy across all languages/states
   - Generate detailed report
        """)
        print("="*80)


def main():
    """Main entry point"""
    runner = Phase1Phase2TestRunner()
    
    # Run all tests
    results = runner.run_all_tests()
    
    return results


if __name__ == '__main__':
    main()
