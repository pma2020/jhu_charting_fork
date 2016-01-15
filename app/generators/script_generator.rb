require 'version.rb'

class ScriptGenerator
  include ActionView::Helpers
  include ActionView::Context

  def initialize(metadata = {}, data = {})
    @metadata = metadata
    @data = data
  end

  def generate
    <<-"EOS"
      #{attribution}
      #{stylesheets}
      <div class='container-fluid'>
        <div id='jhu-chart'>
          <div class='row top-row'>
            <div class='col-md-3'>
              <section class='chart-sidebar'>
                <!-- Nav tabs -->
                <ul class="nav nav-tabs" role="tablist">
                  <li role="presentation" class="active"><a href="#controls" aria-controls="controls" role="tab" data-toggle="tab">Controls</a></li>
                  <li role="presentation"><a href="#help-center" aria-controls="help-center" role="tab" data-toggle="tab">Help Center</a></li>
                </ul>
                <!-- Tab panes -->
                <div class="tab-content">
                  <div role="tabpanel" class="tab-pane active" id="controls">
                    <div class='filters'>
                      <div class='language-selector-container'>
                        #{language_picker}
                      </div>
                      <div id='series-filters-container'>
                        <div class='row'>
                          <div class='col-md-12'>
                            <div id='series-filters-buttons'>
                              <div class="btn-group btn-group-justified" role="group">
                                <div class="btn-group" role="group">
                                  #{button_tag('All', type: :button, value: 'All', id: "select-all-#{container_id}", class: 'i18nable-button btn btn-primary')}
                                </div>
                                <div class="btn-group" role="group">
                                  #{button_tag('Latest', type: :button, value: 'Latest', id: "select-latest-#{container_id}", class: 'i18nable-button btn btn-primary')}
                                </div>
                                <div class="btn-group" role="group">
                                  #{button_tag('Clear', type: :button, value: 'Clear', id: "clear-all-#{container_id}", class: 'i18nable-button btn btn-primary')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class='row'>
                          <div class='col-md-12'>
                            <div id='series-filters'>
                              #{data_series}
                            </div>
                          </div>
                        </div>
                        <div class='clearfix'></div>
                      </div>
                    </div>
                    <div class='filters'>
                      <div id='limiting-filters-container'>
                        #{select_box_filter('indicators', nil, true)}
                        #{select_box_filter('group_filters', 'Break down data by', true)}
                        <div class='row'>
                          <div class='col-md-8'>
                            <h4 class='i18nable-label' data-type='chart-type'>Chart Type:</h4>
                            #{chart_type_buttons('chart_types')}
                          </div>
                          <div class='col-md-4'>
                            <div id='overtime-checkbox-container-#{container_id}' class='overtime-checkbox-container form-group'>
                              <h4 class='i18nable-label' data-type='over-time'>Over-time:</h4>
                              #{overtime_checkbox}
                            </div>
                          </div>
                        </div>
                      </div>
                      #{button_tag('Chart', type: :button, value: 'Chart', id: "submit-chart-filters-#{container_id}", class: 'submit-chart i18nable-button btn btn-success btn-block btn-lg', disabled: 'disabled')}
                    </div>
                  </div>
                  <div role="tabpanel" class="tab-pane" id="help-center">
                    <div class='help-center'>
                      <h4 class='i18nable' data-value='Help Center'>Help Center</h4>
                      <span class='help-definition'></span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            <div class='col-md-9'>
              <section class='chart-viewport'>
                <div id='chart-container-#{container_id}' class='chart-container'>
                  <div class='chart-placeholder'>
                    <h4>
                      <i class='fa fa-bar-chart'></i>
                    </h4>
                  </div>
                  <div class='clearfix'></div>
                </div>
              </section>
            </div>
          </div>
          <div class='row bottom-row'>
            <div class='col-md-9 col-md-offset-3'>
              <section class='citation-viewport'>
                <div class='panel panel-default'>
                  <div class="panel-heading">
                    <h3 class="panel-title">Citations</h3>
                  </div>
                  <div class="panel-body">
                    Citation content
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      #{javascripts}
      <!-- END DO NOT MODIFY CONTENT-->
    EOS
  end

  private

  def attribution
    <<-"EOS"
      <!--
        DO NOT MODIFY CONTENT BELOW
        Chart content generated by JHU Charting application.

        VERSION: #{VERSION}
      -->
    EOS
  end

  def stylesheets
    <<-"EOS"
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css">
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.9.3/css/bootstrap-select.min.css">
      <style>#{ File.read(Rails.root.join('public', 'stylesheets', 'chart_styles.css')) }</style>
    EOS
  end

  def load_js(file)
    File.read(Rails.root.join('public', 'javascripts', file))
  end

  def javascripts
    <<-"EOS"
      <script src='https://code.jquery.com/jquery-2.1.4.min.js'></script>
      <script src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js'></script>
      <script src='https://code.highcharts.com/highcharts.js'></script>
      <script src='https://code.highcharts.com/modules/exporting.js'></script>
      <script src='https://code.highcharts.com/modules/offline-exporting.js'></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.9.3/js/bootstrap-select.min.js"></script>
      <script>
        #{ load_js('markdown.js') }
        #{ load_js('utility.js') }
        #{ load_js('selector.js') }
        #{ load_js('help.js') }
        #{ load_js('validation.js') }
        #{ load_js('translation.js') }
        #{ load_js('interaction.js') }
        #{ load_js('chart_helper.js') }

        var metadata = #{@metadata.fetch(:year_by_country, {}).to_json};
        var availableLanguages = #{@metadata.fetch(:languages, {}).to_json};
        var helpText = #{@metadata.fetch(:help_text, {}).to_json};
        var labelText = #{@metadata.fetch(:label_text, {}).to_json};
        var unavailableFilters = #{@metadata.fetch(:unavailable_filters, {}).to_json};
        var data = #{chart_data};
        var chartContainer = $('#chart-container-#{container_id}');

        $('.filter').on('change', function() { validateFilters('#{container_id}', metadata) });
        $('.filter.filter-indicators').on('change', function() { displayHelpText('#{container_id}') });
        $('.filter.filter-group_filters').on('change', function() { displayHelpText('#{container_id}') });
        $('#select-all-#{container_id}').on('click', function() {selectAll('#{container_id}')});
        $('#select-latest-#{container_id}').on('click', function() {selectLatest('#{container_id}')});
        $('#clear-all-#{container_id}').on('click', function() {clearAll('#{container_id}')});
        $('.clear-select').on('click', function() {clearSelect('#{container_id}', $(this))});
        $('#dataset-language-picker').on('change', function() {updateLanguage('#{container_id}')});
        $('#submit-chart-filters-#{container_id}').on('click', function() { generateChart('#{container_id}'); });
        $(document).ready(function(){
           updateLanguage('#{container_id}');
        });
      </script>
    EOS
  end

  def language_picker
    id = "dataset-language-picker".to_sym
    <<-"EOS"
    <div class='form-group'>
      #{label_tag(id, "Language: ", class: 'i18nable-label', data: { type: 'Language' })}
      #{select_tag(id,
          options_for_select(select_options(@metadata.fetch(:languages).keys), 'None'),
          class: "filter filter-language form-control")}
    </div>
    EOS
  end

  def overtime_checkbox
    <<-"EOS"
    <div class="onoffswitch checkbox-group">
      <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox filter overtime-check-#{container_id}" id="myonoffswitch" disabled='disabled'>
      <label class="onoffswitch-label" for="myonoffswitch">
        <span class="onoffswitch-inner"></span>
        <span class="onoffswitch-switch"></span>
      </label>
    </div>
    EOS
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

  def chart_type_buttons(label=nil)
    id = "dataset_chart_types_#{container_id}".to_sym
    values = @metadata.fetch(:chart_types)

    <<-"EOS"
      <div id=#{id.to_s} class="btn-group" data-toggle="buttons">
        #{chart_button(values)}
      </div>
    EOS
  end

  def chart_button(values)
    values.collect do |value|
      <<-"EOS"
        <label class="btn btn-primary">
          <input type='radio'
                 name='options'
                 class='filter'
                 id='option-#{value.downcase}'
                 data-type='#{value.downcase}'
                 autocomplete='off' checked>
          <i class='fa fa-2x fa-#{chart_icon(value)}'></i>
        </label>
      EOS
    end.join(" ")
  end

  def chart_icon(value)
    case value
    when 'Column'
      "bar-chart"
    when 'Bar'
      'bar-chart fa-rotate-90'
    else
      "#{value.downcase}-chart"
    end
  end

  def select_box_filter(type, label = nil, clear_button = false)
    label = type unless label
    label_safe = label.humanize.capitalize
    label_ref = label.downcase.underscore
    id = "dataset_#{type}_#{container_id}".to_sym
    values = @metadata.fetch(type.to_sym)

    <<-"EOS"
    #{label_tag(id, "#{label_safe}", class: 'i18nable-label', data: { type: label_ref })}
    <div class="input-group">
       #{select_tag(id,  options_for_select(select_options(values)), class: "selectpicker filter filter-#{type} i18nable", prompt: "Select option", data: {"live-search" => "true" })}
       <span class="input-group-btn">
          #{clear_button(id) if clear_button}
       </span>
    </div>
    EOS
  end

  def clear_button(id)
    button_tag(type: :button, id: "clear-#{id}", class: 'clear-select icon-button btn btn-primary', data: { id: id }) do
      content_tag(:i, nil, class: 'fa fa-times')
    end
  end

  def data_series
    @metadata.fetch(:year_by_country, {}).collect do |k,v|
      data_attributes = { country: k }
      <<-"EOS"
      <div class='form-group'>
        <div class='country-header'>
          <b class='i18nable' data-value='#{k}'>#{k}</b>
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
      [item, item]
    end
  end
end
