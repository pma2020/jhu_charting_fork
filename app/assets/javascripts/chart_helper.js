var DEFAULTCOLORS = {
  "nigeria_kaduna":"#e41a1c",
  "burkina":"#377eb8",
  "indonesia":"#4daf4a",
  "niger":"#984ea3",
  "nigeria_lagos":"#ff7f00",
  "uganda":"#ffff33",
  "kenya":"#a65628",
  "ethiopia":"#f781bf",
  "ghana":"#999999",
  "other":"#6a3d9a"
}
var BLACK_AND_WHITE_COLORS = [
  '#111111',
  '#444444',
  '#777777',
  '#AAAAAA',
  '#EEEEEE',
]


function filterData(dataSet, type, value) {
  var items = dataSet.filter(function(hsh) { return hsh[type] === value; });
  return items
};

function dataIntersection(arrays) {
  var result = arrays.shift().filter(function(v) {
    return arrays.every(function(a) {
      return a.indexOf(v) !== -1;
    });
  });
  return result;
};

function select(item, key) {
  var result = [];
  if (isArray(item) == true) {
    item.forEach(function(row) {
      result.push(row[key]);
    });
  }
  return result;
}

function uniq(array) {
  return array.filter(function(i,x,a){return x==a.indexOf(i);});
};

function addRow(data, category, countryRound) {
  var keys = Object.keys(data[0]);
  var tmpItem = {};
  // null out everything
  keys.forEach(function(key) { tmpItem[key] = null; });
  tmpItem['Country'] = countryRound.split("|")[0];
  tmpItem['Round'] = countryRound.split("|")[1];
  tmpItem['Date'] = countryRound.split("|")[2];
  tmpItem['Category'] = category;
  data.push(tmpItem);
};

function syncDataSets(data) {
  var sets = {};
  data.forEach(function(row) {
    var key = row['Country'] + "|" + row['Round'] + "|" + row['Date'];
    if (sets[key] == null) {
      sets[key] = [row['Category']];
    } else {
      var items = sets[key];
      items.push(row['Category']);
      sets[key] = items;
    }
  });
  var allValues  = uniq($.map(sets, function(v) { return v; }));

  Object.keys(sets).forEach(function(countryRound) {
    allValues.forEach(function(category) {
      if (sets[countryRound].indexOf(category) == -1) {
        addRow(data, category, countryRound);
      }
    });
  });

  return data;
};

function reduceDataSet(data, filters, filterType) {
  var result = [];
  if (isArray(filters) == true) {
    filters.forEach(function(filter) {
      result.push(filterData(data, filterType, filter));
    })
  } else {
    result.push(filterData(data, filterType, filters));
  }
  result = [].concat.apply([], result);
  return result;
};

function scopeDataSet(data, scope, countries) {
  var scopedData = {};

  if(scope == 'OverTime') {
    scope = 'Category';
    countries.forEach(function(country) { scopedData[country] = {}; });
    data.forEach(function(row) {
      appendToHash(scopedData[row['Country']], row[scope], row);
    });
  } else {
    data.forEach(function(row) {
      appendToHash(scopedData, row[scope], row);
    });
  }
  return scopedData;
};

function reduceDataBasedOnSelection(countries, grouping, dates, overTime) {
  var reducedDataSet;
  var syncedData;

  reducedDataSet = dataIntersection([
    reduceDataSet(data, countries, 'Country'),
    reduceDataSet(data, dates, 'Date'),
    reduceDataSet(data, grouping, 'Grouping')
  ]);

  if (overTime) {
    syncedData = reducedDataSet;
  } else {
    syncedData = syncDataSets(reducedDataSet);
  }

  var dataTestResult = validateDataset(syncedData, countries);
  var validData = dataTestResult[0];
  var error = dataTestResult[1];

  if(validData) {
    var scopedData;

    if(overTime) {
      scopedData = scopeDataSet(reducedDataSet, 'OverTime', countries);
    } else if(multiSeries(countries, dates)) {
      scopedData = scopeDataSet(reducedDataSet, 'Category', countries);
    } else {
      scopedData = scopeDataSet(reducedDataSet, 'Country');
    }

    return scopedData;
  } else {
    alert(translate(error, labelText));
    return false;
  }
};

function generateSeriesData(chartType, countries, indicator, grouping, dates, overTime, blackAndWhite) {
  var dataSet = reduceDataBasedOnSelection(countries, grouping, dates, overTime);
  var series = [];
  var unassessedRounds = {};
  var xAxis = [];
  var colors;
  if (blackAndWhite) {
    colors = BLACK_AND_WHITE_COLORS
  } else {
    colors = DEFAULTCOLORS
  }

  if(overTime) {
    dates.sort(function(a,b){ return Date.parse(a) - Date.parse(b); });

    for(var key in dataSet) {
      var countryData = dataSet[key];

      var itemIndex = 1;
      for(var countryKey in countryData) {
        var data = countryData[countryKey];
        var newRow = {};
        var country = countryData[countryKey][0]['Country'];
        var curColor = shadeColor(colors[keyify(country)], (5*itemIndex));
        newRow['name'] = titleCase(key) + ' ' + translate(countryKey, labelText);
        newRow['data'] = [];
        newRow['color'] = curColor;

        var tmpHsh = {};

        // Gather the possible keys
        data.forEach(function(row) {
          dates.forEach(function(date) {
            if(date == row['Date']) {
              tmpHsh[date] = row[indicator];
            } else {
              if(tmpHsh[date] == null || tmpHsh[date] == undefined) {
                tmpHsh[date] = null;
              }
            }
          });
        });

        var country;
        var category;
        var round;
        var nullKeys = Object.keys(tmpHsh).filter(function(key) { return tmpHsh[key] == null });
        var nullIndexes = [];

        nullKeys.forEach(function(date) { nullIndexes.push(date); });

        data.forEach(function(row) {
          var dataElement = {};

          country = translate(row['Country'], labelText);
          category = row['Category'];
          round = row['Round'];

          dataElement['name'] = country + ' ' + category + ' ' + round;
          dataElement['y'] = parseFloat(checkValue(tmpHsh[row['Date']]));
          dataElement['x'] = (new Date(row['Date']+"-02")).getTime()

          newRow['data'].push(dataElement);
        });

        nullIndexes.forEach(function(date) {
          var dataElement = {};

          dataElement['name'] = country + ' ' + category;
          dataElement['y'] = null;
          dataElement['x'] = (new Date(date+"-02")).getTime()

          newRow['data'].push(dataElement);
        });

        itemIndex++;
        xAxis = null;
        series.push(newRow);
      };
    }
  } else if(multiSeries(countries, dates)) {
    var tmpHsh = {};

    for(var key in dataSet) {
      var data = dataSet[key];

      data.forEach(function(row) {
        key = dateRoundLabel(row['Country'], row['Date'], row['Round']);
        appendToHash(tmpHsh, key, checkValue(row[indicator]));
      });
    };

    var itemIndex = 0;
    for(var countryDate in tmpHsh) {
      var country = keyify(countryDate.split("|")[0]);
      var name  = countryDate.split("|")[1];
      var dataPoints = tmpHsh[countryDate];
      var newRow = {};
      var color;
      var shadedColor;

      if (Object.keys(tmpHsh).length > 5 && blackAndWhite) {
        alert('Black and White color scheme is only available for 5 or fewer Country/Rounds. Please select fewer Country/Rounds and try again');
        return false;
      }

      if (blackAndWhite) {
        color = colors[itemIndex];
      } else {
        color = colors[country]
        color = shadeColor(color, (5*itemIndex + 1));
      }

      newRow['data'] = [];
      newRow['name'] = name;
      newRow['color'] = color;

      dataPoints.forEach(function(dataPoint) {
        var dataElement = {};
        var val = checkValue(dataPoint);
        dataElement['y'] = parseFloat(val);
        newRow['data'].push(dataElement);
      });

      itemIndex++;
      series.push(newRow);
    };

    var index = 0;
    for(var key in dataSet) {
      var hasNaN = false;
      var translatedText = translate(key, labelText);
      series.forEach(function(round) {
        if (isNaN(round['data'][index]['y'])){
          hasNaN = true;
          if (unassessedRounds[key] == null || unassessedRounds[key] == undefined) {
            unassessedRounds[key] = [];
          }
          unassessedRounds[key].push(round['name']);
        }
      });
      if (hasNaN) {
        xAxis.push(translatedText + '*');
      } else {
        xAxis.push(translatedText);
      }
      index++;
    }

  } else {
    var itemIndex = 1;
    for(var key in dataSet) {
      var data = dataSet[key];
      var newRow = {};
      var color = colors[keyify(countries[0])];

      newRow['data'] = [];
      newRow['name'] = dateRoundLabel(countries[0], dates[0], data[0]['Round']);
      newRow['color'] = shadeColor(color, (5*itemIndex));

      data.forEach(function(row) {
        var dataElement = {};
        xAxis.push(translate(row['Category'], labelText))
        dataElement['name'] = row['Category'];
        dataElement['y'] = parseFloat(checkValue(row[indicator]));
        newRow['data'].push(dataElement);
      });

      series.push(newRow);
    }
    itemIndex++;
  };

  chartComponents = [xAxis, series, unassessedRounds];
  return chartComponents;
};

function dateRoundLabel(country, date, round) {
  return titleCase(country) + "|" + titleCase(translate(country, labelText)) + ' ' + date.split("-")[0] + ' ' + round;
};

function translateCountries(countries) {
  var translated = [];
  countries.forEach(function(country) {
    translated.push(titleCase(translate(country, labelText)));
  });
  return translated;
};

function generateTitle(countries, indicator, grouping) {
  var titleResult =  indicator;
  var byArticle = translate('by', labelText);
  var forArticle = translate('for', labelText);
  if (grouping != 'None') { titleResult += ' ' + byArticle + ' ' + grouping; }
  titleResult += ' ' + forArticle + ' ' + translateCountries(countries).join(', ');
  return titleResult;
};

function generateCitation(partners) {
  var citation = "Performance Monitoring and Accountability 2020. Johns Hopkins University; <br/>";
  var index = 1;
  for (partner in partners) {
    partner = partners[partner];
    citation += translate(partner+"_P", labelText) + "; ";
    if (index % 3 == 0 && index != 0) {
      citation += "<br/>";
    }
    index++;
  }
  citation += " " + new Date().toJSON().slice(0,10);
  return citation;
};

function unassessedRoundsWarning(unassessedRounds) {
  var warnings = [];
  Object.keys(unassessedRounds).forEach(function(indicator) {
    var warningString = indicator + '* was not assessed in: ' + unassessedRounds[indicator].join(', ');
    warnings.push(warningString);
  });
  return warnings.join("<br/>");
};

function chartData(containerId, overTime) {
  var chartType = getSelectedChartType(containerId, 'chart_types');
  var selectedCountries = getCountries(containerId);
  var selectedDates = getCheckedItems(containerId, 'year');
  var selectedIndicator = getSelectedItemValue(containerId, 'nested_indicators');
  var selectedGrouping = getSelectedItemValue(containerId, 'disaggregators');
  var blackAndWhite = getCheckValue(containerId, 'black_and_white');
  var citationText = generateCitation(selectedCountries);
  if (typeof overTime == 'undefined') {
    var overTime = $('.overtime-check-' + containerId).prop('checked');
  }

  if(validateFilters(containerId)) {
    var title = generateTitle(
      selectedCountries,
      getSelectedItemDisplayText(containerId, 'nested_indicators'),
      getSelectedItemDisplayText(containerId, 'disaggregators')
    );

    var chartComponents = generateSeriesData(
      chartType,
      selectedCountries,
      selectedIndicator,
      selectedGrouping,
      selectedDates,
      overTime,
      blackAndWhite
    );

    var xAxis = xAxisData(overTime, chartComponents[0]);
    var yAxis = getSelectedItemDisplayText(containerId, 'nested_indicators');
    var seriesData = chartComponents[1];
    var warnings = unassessedRoundsWarning(chartComponents[2]);

    return [xAxis, yAxis, title, chartType, selectedGrouping, seriesData, warnings, citationText];
  }
};

function legendContent(lableColor, seriesCount) {
  var legendContent = {
    itemStyle: {
      color: lableColor
    },
  }
  if (seriesCount > 5) {
    legendContent['align'] = 'right',
    legendContent['verticalAlign'] = 'top',
    legendContent['layout'] = 'vertical',
    legendContent['x'] = 0,
    legendContent['y'] = 40
  }
  return legendContent
};

function generateChart(containerId) {
  var styles = chartStyles();
  var overrides = chartOverrides();

  var data = chartData(containerId) || [];
  var xAxis = data[0];
  var yAxis = data[1];
  // Override y-axis-label if necessary
  if (overrides['y-axis-label'] != "") { yAxis = overrides['y-axis-label']; }
  var title = data[2];
  var chartType = data[3].toLowerCase();
  var seriesData = data[5];
  var warnings = data[6];
  var citationText = data[7];

  var footerText = warnings + '<br/><br/>' + citationText;

  if(seriesData != false) {
    $('#chart-container-' + containerId).highcharts({
      plotOptions: {
        series: {
          connectNulls: true,
          marker: {
            radius: overrides['marker-size']
          },
          dataLabels: {
            x: overrides['data-label-x-position'],
            y: overrides['data-label-y-position']
          }
        },
        bar: { dataLabels: { enabled: true } },
        column: { dataLabels: { enabled: true } },
        line: { dataLabels: { enabled: true } },
        pie: { dataLabels: { enabled: true } }
      },
      chart: {
        type: chartType,
        marginBottom: 150,
        backgroundColor: styles["chart-background-color"],
        style: {
          fontFamily: overrides['chart-font']
        }
      },
      exporting: { // specific options for the exported image
        chartOptions: {
          plotOptions: {
            series: {
              dataLabels: {
                enabled: true
              }
            }
          }
        },
        scale: 3,
        fallbackToExportServer: false
      },
      credits: {
        text: footerText,
        position: {
          align: 'center',
          y: -100
        },
      },
      legend: legendContent(styles['label-color'], seriesData.length),
      title: {
        style: {
          color: styles['title-color']
        },
        text: title
      },
      subtitle: {
        style: {
          color: styles['title-color']
        },
        text: "PMA 2020"
      },
      xAxis: xAxis,
      yAxis: {
        min: 0,
        title: {
          text: yAxis,
          style: {
            color: styles['label-color']
          },
          x: overrides['y-axis-x-position'],
          y: overrides['y-axis-y-position'],
        },
        lineColor: styles['y-axis-color'],
        lineWidth: styles['y-axis-width'],
        labels: {
          style: {
            color: styles['label-color']
          }
        },
        tickColor: styles['tick-color'],
        minorTickColor: styles['minor-tick-color']
      },
      series: seriesData
    });

    scrollToAnchor('#chart-container-' + containerId);
  }
};