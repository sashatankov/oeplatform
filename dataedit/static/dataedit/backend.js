var filters = [];
var table_container;
var query_builder;
var where;

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function fail_handler(jqXHR, exception) {
    var msg = '';
    if (jqXHR.status === 0) {
        msg = 'Not connected.\n Verify Network.';
    } else if (jqXHR.status == 404) {
        msg = 'Requested page not found. [404]';
    } else if (jqXHR.status == 500) {
        msg = 'Internal Server Error [500].';
    } else if (exception === 'parsererror') {
        msg = 'Requested JSON parse failed.';
    } else if (exception === 'timeout') {
        msg = 'Time out error.';
    } else if (exception === 'abort') {
        msg = 'Ajax request aborted.';
    } else {
        msg = 'Uncaught Error.\n' + jqXHR.responseText;
    }
    console.log(msg);
}

function request_data(data, callback, settings) {
    $("#loading-indicator").show();

    var base_query = {
        "from": {
            "type": "table",
            "schema": schema,
            "table": table
        }
    };
    var count_query = JSON.parse(JSON.stringify(base_query));
    count_query["fields"] = [{
        type: "function",
        function: "count",
        operands: ["*"]
    }];
    count_query.where = where;
    var select_query = JSON.parse(JSON.stringify(base_query));
    select_query["order_by"] = data.order.map(function (c) {
        return {
            type: "column",
            column: table_info.columns[c.column],
            ordering: c.dir
        }
    });
    select_query.offset = data.start;
    select_query.limit = data.length;
    if(where !== null){
        select_query.where = where;
    }
    var draw = Number(data.draw);
    $.when(
        $.ajax({
            type: 'POST',
            url: '/api/v0/advanced/search',
            dataType: 'json',
            data: {
                csrfmiddlewaretoken: csrftoken,
                query: JSON.stringify(count_query)
            }
        }), $.ajax({
            type: 'POST',
            url: '/api/v0/advanced/search',
            dataType: 'json',
            data: {
                csrfmiddlewaretoken: csrftoken,
                query: JSON.stringify(select_query)
            }
        })
    ).done(function (count_response, select_response) {
        $("#loading-indicator").hide();
        callback({
            data: select_response[0].data,
            draw: draw,
            recordsFiltered: count_response[0].data[0][0],
            recordsTotal: table_info.rows
        });
    }).fail(fail_handler);
}

var table_info = {
    columns: [],
    rows: null,
    name: null,
    schema: null
};

load_table = function (schema, table, csrftoken) {

    table_info.name = table;
    table_info.schema = schema;
    var count_query = {
        from: {
            type: "table",
            schema: schema,
            table: table
        },
        fields: [{
            type: "function",
            function: "count",
            operands: ["*"]
        }]
    };
    $.when(
        $.ajax({
            url: '/api/v0/schema/' + schema + '/tables/' + table + '/columns',
        }), $.ajax({
            type: 'POST',
            url: '/api/v0/advanced/search',
            dataType: 'json',
            data: {
                csrfmiddlewaretoken: csrftoken,
                query: JSON.stringify(count_query)
            }
        })
    ).done(function (column_response, count_response) {
        Object.getOwnPropertyNames(column_response[0]).forEach(function (colname) {
            var str = '<th>' + colname + '</th>';
            $(str).appendTo('#datatable' + '>thead>tr');
            table_info.columns.push(colname);
            var dt = column_response[0][colname]["data_type"];
            var mapped_dt;
            if(dt in type_maps) {
                mapped_dt = type_maps[dt];
            } else {
                if(valid_types.includes(dt)) {
                    mapped_dt = dt;
                } else {
                    mapped_dt = "string";
                }
            }
            filters.push({id: colname, type: mapped_dt});
            return {data: colname, name: colname};
        });
        table_info.rows = count_response[0].data[0][0];
        table_container = $('#datatable').DataTable({
            ajax: request_data,
            serverSide: true,
            scrollY: true,
            scrollX: true,
            searching: true,
            search: {}
        });
        query_builder = $('#builder').queryBuilder({
            filters: filters
        });
        $('#btn-set').on('click', apply_filters);

    }).fail(fail_handler)
};

function apply_filters(){
    var rules = $('#builder').queryBuilder('getRules');
    if(rules !== null) {
        where = parse_filter(rules);
        table_container.ajax.reload();
    }
}

function parse_filter(f){
    return {
        type: "operator",
        operator: f.condition.toLowerCase(),
        operands: f.rules.map(parse_rule)
    }
}

function negate(q){
    return {
        type: "operator",
        operator: "not",
        operands: [q]
    }
}

function parse_rule(r){
    switch(r.operator) {
        case "equal":
            return {
                type: "operator",
                operator: "=",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "not_equal":
            return negate({
                type: "operator",
                operator: "=",
                operands: [{type:"column", column: r.field}, r.value]
            });
        case "in":
            return {
                type: "operator",
                operator: "in",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "not_in":
            return negate({
                type: "operator",
                operator: "in",
                operands: [{type:"column", column: r.field}, r.value]
            });
        case "less":
            return {
                type: "operator",
                operator: "<",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "less_or_equal":
            return {
                type: "operator",
                operator: "<=",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "greater":
            return {
                type: "operator",
                operator: ">",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "greater_or_equal":
            return {
                type: "operator",
                operator: ">=",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "between":
            return {
                type: "operator",
                operator: "and",
                operands:
                    [
                        {
                            type: "operator",
                            operator: "<",
                            operands: [r.value[0], {type:"column", column: r.field}]
                        }, {
                            type: "operator",
                            operator: "<",
                            operands: [{type:"column", column: r.field}, r.value[1]]
                    }]
            };
        case "not_between":
            return negate({
                type: "operator",
                operator: "and",
                operands:
                    [
                        {
                            type: "operator",
                            operator: "<",
                            operands: [r.value[0], {type:"column", column: r.field}]
                        }, {
                            type: "operator",
                            operator: "<",
                            operands: [{type:"column", column: r.field}, r.value[1]]
                    }]
            });
        case "begins_with":
            return {
                type: "operator",
                operator: "equal",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "not_begins_with":
            return {
                type: "operator",
                operator: "equal",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "contains":
            return {
                type: "operator",
                operator: "in",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "not_contains":
            return negate({
                type: "operator",
                operator: "in",
                operands: [{type:"column", column: r.field}, r.value]
            });
        case "ends_with":
            return {
                type: "operator",
                operator: "equal",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "not_ends_with":
            return {
                type: "operator",
                operator: "equal",
                operands: [{type:"column", column: r.field}, r.value]
            };
        case "is_empty":
            return {
                type: "operator",
                operator: "=",
                operands: [{type:"column", column: r.field}, '']
            };
        case "is_not_empty":
            return negate({
                type: "operator",
                operator: "=",
                operands: [{type:"column", column: r.field}, '']
            });
        case "is_null":
            return {
                type: "operator",
                operator: "IS",
                operands: [{type:"column", column: r.field}, null]
            };
        case "is_not_null":
            return negate({
                type: "operator",
                operator: "IS",
                operands: [{type:"column", column: r.field}, null]
            });
    }
}

var type_maps = {
    "double precision": "double",
};

var valid_types = ["string", "integer", "double", "date", "time", "datetime", "boolean"];