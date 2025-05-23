# DeepScrape

> Adding consistency back to search

## Motivation

Amazing progress has been made in the search space by the various offerings of DeepResearch.
While strong at generated large amounts of analysis, the single agent system fails at balacing multiple needs.
Ultimately this leads to:
* Incomplete Analysis 
If you ask it to analyze all the YC startups, it will arbitrarily analyze some of them.
* Inconsistent Analysis
If you ask for certain attributes to be collected and crossanalyzed there is no structural guarantee it will follow through.

## Features
* Multi-Agent System
  - Intent agent analyzes user requests and determines table structure (rows and columns needed)
  - Search agent performs internet searches using Tavily to gather information
  - Systematic cell-by-cell filling with progress tracking
  - Unknown values marked clearly when information cannot be found

## Workflow
1. **Determine Row Count**: Search to find how many items match the criteria
2. **Determine Columns**: Analyze user request to identify required attributes  
3. **Fill Table**: Systematically search and fill each cell, showing progress
4. **Output Results**: Present complete table with all available information

## Implementation

Using the NVIDIA Agent Intelligence Toolkit with Tavily internet search

## Installation
uv pip install -e DeepScrape
aiq run --config_file=DeepScrape/configs/config.yml --input "find me all the YC companies from the S2017 batch and their valuations and founder names" 
