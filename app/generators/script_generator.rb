class ScriptGenerator
  include ActionView::Helpers
  include ActionView::Context

  def initialize(metadata = {}, data = {})
    @metadata = metadata
    @data = data
  end

  def generate
    <<-"EOS"
      <!--
        DO NOT MODIFY CONTENT BELOW
        Chart content generated by JHU Charting application.
      -->
      <style>#{ File.read(Rails.root.join('public', 'stylesheets', 'chart_styles.css')) }</style>
      <div id='jhu-chart'>
        <div class='filters'>
          <div id='series-filters-container'>
            <div id='series-filters'>
              #{data_series}
            </div>
            <div id='series-filters-buttons'>
              <button id='select-all-#{container_id}'>Select All</button>
              <button id='clear-all-#{container_id}'>Clear All</button>
            </div>
            <div class='clearfix'></div>
          </div>
          <div id='limiting-filters-container'>
            #{select_box_filter('group_filters', 'Disaggregator')}
            #{select_box_filter('indicators', nil, true)}
            #{select_box_filter('chart_types')}
            <div id='overtime-checkbox-container-#{container_id}' class='form-group'>
              <h4>Over-time:</h4>
              #{overtime_checkbox}
            </div>
            <div class='clearfix'></div>
          </div>
          #{submit_tag("Chart", id: "submit-chart-filters-#{container_id}", class: 'submit-chart')}
          <div class='help-center'>
            <h4>Help Center</h4>
            <span class='help-definition'></span>
          </div>
        </div>
        <div id='chart-container-#{container_id}' style='width:100%; height:600px;'></div>
      </div>
      <script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>
      <script src='https://code.highcharts.com/highcharts.js'></script>
      <script src='https://code.highcharts.com/modules/exporting.js'></script>
      <script src='https://code.highcharts.com/modules/offline-exporting.js'></script>
      <script>#{ File.read(Rails.root.join('public', 'javascripts', 'markdown.js')) }</script>
      <script>#{ File.read(Rails.root.join('public', 'javascripts', 'chart_helper.js')) }</script>
      <script>
        var metadata = #{@metadata.fetch(:year_by_country, {}).to_json};
        var helpText = #{@metadata.fetch(:help_text, {}).to_json};
        var data = #{chart_data};
        var chartContainer = $('#chart-container-#{container_id}');

        $('.filter').on('change', function() { validateFilters('#{container_id}', metadata) });
        $('.filter.filter-indicators').on('change', function() { displayHelpText('#{container_id}') });
        $('.filter.filter-group_filters').on('change', function() { displayHelpText('#{container_id}') });
        $('#select-all-#{container_id}').on('click', function() {selectAll('#{container_id}')});
        $('#clear-all-#{container_id}').on('click', function() {clearAll('#{container_id}')});

        $('#submit-chart-filters-#{container_id}').on('click', function() {
          var chartType = getSelectedItem('#{container_id}', 'chart_types');
          var selectedCountries = getCountries('#{container_id}');
          var selectedDates = getCheckedItems('#{container_id}', 'year');
          var selectedIndicator = getSelectedItem('#{container_id}', 'indicators');
          var selectedGrouping = getSelectedItem('#{container_id}', 'group_filters');
          var overTime = $('.overtime-check-#{container_id}').prop('checked');

          var title = generateTitle(selectedCountries, selectedIndicator, selectedGrouping);
          var chartComponents;
          if(overTime) {
            chartComponents= generateSeriesData(chartType, selectedCountries, selectedIndicator, selectedGrouping, selectedDates, true);
          } else {
            chartComponents = generateSeriesData(chartType, selectedCountries, selectedIndicator, selectedGrouping, selectedDates, false);
          }
          var xAxis = chartComponents[0];
          var seriesData = chartComponents[1]

          generateChart('#{container_id}', chartType, title, xAxis, selectedIndicator, seriesData);
        });
      </script>
      <!-- END DO NOT MODIFY CONTENT-->
    EOS
  end

  private

  def overtime_checkbox
    collection_check_boxes(:dataset, :overtime, [['Graph series over time', 'Graph series over time']], :first, :last) do |b|
      content_tag(:span, class: "checkbox-group") do
        b.label do
          b.check_box(class: "filter overtime-check-#{container_id}", disabled: 'disabled') + b.text
        end
      end
    end
  end

  def checkbox_filter(type)
    <<-"EOS"
    <div class='form-group'>
      #{label_tag("dataset_#{type}".to_sym, "#{type.humanize.capitalize}:")}
      #{checkboxes(type)}
    </div>
    EOS
  end

  def checkboxes(type, values, disabled = false, data_attributes = {})
    collection_check_boxes(:dataset, type.to_sym, select_options(values), :first, :last) do |b|
      content_tag(:span, class: "checkbox-group") do
        b.label do
          b.check_box(
            class: "filter #{type.singularize}-check-#{container_id}",
            disabled: disabled,
            data: data_attributes
          ) + b.text
        end
      end
    end
  end

  def select_box_filter(type, label = nil, hint_text = false)
    label = type unless label
    id = "dataset_#{type}_#{container_id}".to_sym
    values = @metadata.fetch(type.to_sym)

    <<-"EOS"
    <div class='form-group'>
      #{label_tag(id, "#{label.humanize.capitalize}:")}
      #{hint(hint_text)}
      <span class='select-container'>
        #{select_tag(id,  options_for_select(select_options(values), 'None'), class: "filter filter-#{type}")}
      </span>
    </div>
    EOS
  end

  def hint(hint_text)
    if hint_text
      "<span class='hint' title='Need help? Select a filter and a definition of the indicator will be displayed below.'>?</span>"
    end
  end

  def data_series
    @metadata.fetch(:year_by_country, {}).collect do |k,v|
      data_attributes = { country: k }
      <<-"EOS"
      <div class='form-group'>
        <div class='country-header'>
          <b>#{k}</b>
        </div>
        <div class='date-selection'>
          #{checkboxes('year', v, false, data_attributes)}
        </div>
      </div>
      EOS
    end.join("")
  end

  def container_id
    @container_id ||= SecureRandom.hex(15)
  end

  def chart_data
    @data.to_json
  end

  def select_options(values)
    values.collect do |item|
      item = item.to_s
      [item.humanize, item]
    end
  end
end
