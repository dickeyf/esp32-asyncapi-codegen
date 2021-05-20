#!/bin/bash
rm -rf output
ag https://raw.githubusercontent.com/asyncapi/generator/v1.0.1/test/docs/dummy.yml ./ -o output
