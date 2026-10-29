#!/usr/bin/env bash
# Runs a CI command; on failure, surfaces the last lines of output as a
# GitHub annotation so failures are readable without downloading logs.
set -o pipefail
label="$1"; shift
"$@" 2>&1 | tee /tmp/ci-step.log
code=${PIPESTATUS[0]}
if [ "$code" -ne 0 ]; then
  if [ -n "$CI_SUMMARY" ]; then
    { grep -E "$CI_SUMMARY" /tmp/ci-step.log | head -n 80; echo "-----"; tail -n 60 /tmp/ci-step.log; } > /tmp/ci-tail.log
  else
    tail -n 120 /tmp/ci-step.log > /tmp/ci-tail.log
  fi
  msg=$(cat /tmp/ci-tail.log | sed -e 's/%/%25/g' -e 's/\r//g' | awk '{printf "%s%%0A", $0}')
  echo "::error title=${label} failed::${msg}"
fi
exit "$code"
