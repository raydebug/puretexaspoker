#!/bin/bash
cd /Volumes/Data/work/puretexaspoker
./run_verification.sh 2>&1 | tee test_execution_$(date +%s).log
