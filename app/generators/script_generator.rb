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
      <div class='filters'>
        #{checkbox_filter('countries')}
        #{checkbox_filter('years', true)}
        #{select_box_filter('group_filters')}
        #{select_box_filter('indicators')}
        #{select_box_filter('chart_types')}
        #{overtime_checkbox}
        #{submit_tag("Chart", id: "submit-chart-filters-#{container_id}")}
      </div>
      <div id='chart-container-#{container_id}' style='width:100%; height:400px;'></div>
      <script src='https://code.highcharts.com/highcharts.js'></script>
      <script>#{ File.read(Rails.root.join('public', 'javascripts', 'chart_helper.js')) }</script>
      <script>
        var metadata = #{@metadata.fetch(:year_by_country, {}).to_json};;
        var data = #{chart_data};
        var chartContainer = $('#chart-container-#{container_id}');

        $('.filter').on('change', function() { validateFilters('#{container_id}', metadata) });

        $('#submit-chart-filters-#{container_id}').on('click', function() {
          var chartType = getSelectedItem('#{container_id}', 'chart_types');
          var selectedCountries = getCheckedItems('#{container_id}', 'country');
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

  def checkbox_filter(type, disabled = false)
    <<-"EOS"
    <div class='form-group'>
      #{label_tag("dataset_#{type}".to_sym, "#{type.humanize.capitalize}:")}
      #{checkboxes(type, disabled)}
    </div>
    EOS
  end

  def checkboxes(type, disabled)
    collection_check_boxes(:dataset, type.to_sym, select_options(type.to_sym), :first, :last) do |b|
      content_tag(:span, class: "checkbox-group") do
        b.label do
          b.check_box(class: "filter #{type.singularize}-check-#{container_id}", disabled: disabled) + b.text
        end
      end
    end
  end

  def select_box_filter(type)
    id = "dataset_#{type}_#{container_id}".to_sym
    <<-"EOS"
    <div class='form-group'>
      #{label_tag(id, "#{type.humanize.capitalize}:")}
      <span class='select-container'>#{select_tag(id,  options_for_select(select_options(type.to_sym), "None"), class: "filter")}</span>
    </div>
    EOS
  end

  def container_id
    @container_id ||= SecureRandom.hex(15)
  end

  def chart_data
    @data.to_json
  end

  def select_options(type)
    @metadata[type].collect do |item|
      item = item.to_s
      [item.humanize, item]
    end
  end
end
