#!/bin/bash
rm -rf output

if [ $# -eq 0 ];  then
    ASYNC_API=https://raw.githubusercontent.com/asyncapi/generator/v1.0.1/test/docs/dummy.yml
else
    ASYNC_API="$1"
fi

ag "$ASYNC_API" ./ -o output
