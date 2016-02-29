var DEFAULTCOLORS = {
  "nigeria_kaduna":"#003366",
  "burkina":"#000066",
  "indonesia":"#660066",
  "niger":"#993333",
  "nigeria_lagos":"#663300",
  "uganda": "#003300",
  "kenya": "#999900",
  "ethiopia": "#09465b",
  "ghana": "#5FB404",
  "other": "#0000000"
}


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

  reducedDataSet = dataIntersection([
    reduceDataSet(data, countries, 'Country'),
    reduceDataSet(data, dates, 'Date'),
    reduceDataSet(data, grouping, 'Grouping')
  ]);

  var dataTestResult = validateDataset(reducedDataSet, countries);
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

function generateSeriesData(chartType, countries, indicator, grouping, dates, overTime, colors) {
  var dataSet = reduceDataBasedOnSelection(countries, grouping, dates, overTime);
  var series = [];
  var xAxis = [];
  colors = colors || DEFAULTCOLORS;

  if(overTime) {
    dates.sort(function(a,b){ return Date.parse(a) - Date.parse(b); });

    for(var key in dataSet) {
      var countryData = dataSet[key];

      var itemIndex = 1;
      for(var countryKey in countryData) {
        var data = countryData[countryKey];
        var newRow = {};
        var country = countryData[countryKey][0]['Country'];
        var curColor = shadeColor(colors[keyify(country)], (20*itemIndex));
        newRow['name'] = key + ' ' + translate(countryKey, labelText);
        newRow['data'] = [];
        newRow['color'] = curColor;

        var tmpHsh = {};

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
        //appendToHash(tmpHsh, key, { 'country': row['Country'] });
      });
    };

    for(var key in dataSet) { xAxis.push(translate(key, labelText)); }

    var itemIndex = 1;
    for(var countryDate in tmpHsh) {
      var country = keyify(countryDate.split("|")[0]);
      var name  = countryDate.split("|")[1];
      var dataPoints = tmpHsh[countryDate];
      var newRow = {};
      var color = colors[country];

      newRow['data'] = [];
      newRow['name'] = name;
      newRow['color'] = shadeColor(color, (20*itemIndex));

      dataPoints.forEach(function(dataPoint) {
        var dataElement = {};
        dataElement['y'] = parseFloat(checkValue(dataPoint));
        newRow['data'].push(dataElement);
      });

      itemIndex++;
      series.push(newRow);
    };

  } else {
    var itemIndex = 1;
    for(var key in dataSet) {
      var data = dataSet[key];
      var newRow = {};
      var color = colors[keyify(countries[0])];

      newRow['data'] = [];
      newRow['name'] = dateRoundLabel(countries[0], dates[0], data[0]['Round']);
      newRow['color'] = shadeColor(color, (20*itemIndex));

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

  chartComponents = [xAxis, series];
  return chartComponents;
};

function dateRoundLabel(country, date, round) {
  return country + "|" + translate(country, labelText) + ' ' + date.split("-")[0] + ' ' + round;
};

function translateCountries(countries) {
  var translated = [];
  countries.forEach(function(country) {
    translated.push(translate(country, labelText));
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
  var citation = "Performance Monitoring and Accountability 2020. Johns Hopkins University; ";
  for (partner in partners) {
    partner = partners[partner];
    citation += translate(partner+"_P", labelText) + "; ";
  }
  citation += " " + new Date().toJSON().slice(0,10);
  return citation;
};

function xAxisData(overtime, components) {
  if (overtime) { return { type: 'datetime' } }
  else { return { categories: components } }
};

function generateChart(containerId) {
  var chartType = getSelectedChartType(containerId, 'chart_types');
  var selectedCountries = getCountries(containerId);
  var selectedDates = getCheckedItems(containerId, 'year');
  var selectedIndicator = getSelectedItemValue(containerId, 'nested_indicators');
  var selectedGrouping = getSelectedItemValue(containerId, 'disaggregators');
  var overTime = $('.overtime-check-' + containerId).prop('checked');
  $(".citation-viewport .panel .panel-body").text(generateCitation(selectedCountries));

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
      overTime
    );

    var xAxis = xAxisData(overTime, chartComponents[0]);
    var yAxis = getSelectedItemDisplayText(containerId, 'nested_indicators');
    var seriesData = chartComponents[1]

    if(seriesData != false) {
      $('#chart-container-' + containerId).highcharts({
        plotOptions: {
          series: { connectNulls: true, },
          bar: { dataLabels: { enabled: true } },
          column: { dataLabels: { enabled: true } },
          line: { dataLabels: { enabled: true } },
          pie: { dataLabels: { enabled: true } }
        },
        chart: { type: chartType.toLowerCase() },
        title: { text: title },
        subtitle: { text: "PMA 2020" },
        xAxis: xAxis ,
        yAxis: { min: 0, title: { text: yAxis } },
        series: seriesData
      });

      scrollToAnchor('#chart-container-' + containerId);
    }
  }
};
