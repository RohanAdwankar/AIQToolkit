# Data Agent Workflow

> Fetches data from the internet and populates python dataframe.

## Motivation
Amazing progress has been made in the search space by the various offerings of DeepResearch.
While strong at generated large amounts of analysis, there are some draw backs:
* Incomplete Analysis 
Due to the unstructured nature, the system make make some analysis but not comprehensively (ie. if it collects the height and weight of one anima but doesnt collect it for all the animals discussed).
* Inconsistent Analysis
If you ask for certain attributes to be collected and crossanalyzed there is no structural guarantee it will follow through with the overlaps.
* Difficult Extrapolation
Though they generate large volumes of text its difficult to then continue the analysis into generate plots for example.

## Features
1. **Determine Table**: Based on the problem find out how many columns are needed
2. **Fill Table**: Systematically search the internet and fill each cell
3. **Output Results**: Present complete table live as the AI edits the table

## Installation
uv pip install -e data_agent
aiq run --config_file 'data_agent/configs/config.yml' --input "get data for each year from 2020 to 2015 for the us population"