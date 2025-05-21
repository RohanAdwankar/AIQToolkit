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
  Intent agent analyzes the intent of the user and creates a plan to follow such as if tabular data is needed, and if so what is th expected ranges of these attributes and what attributes are needed, etc.
  Scripter agents generate the code to scrape the relevant data needed for each attribute.
  Presentation agent, given search completion confirmation from the intent agent, formats the report effectively, generating figures based on the data for example.
* Intuitive UI for viewing Search Results

## Implementation

Using the NVIDIA Agent Intelligence Toolkit

## Installation
uv pip install -e DeepScrape
aiq run --config_file=DeepScrape/configs/config.yml --input "who was Djikstra?" 
