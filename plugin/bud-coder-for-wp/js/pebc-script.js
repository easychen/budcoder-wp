jQuery(document).ready(function($) {
    $('#pebc-form').on('submit', function(e) {
        e.preventDefault(); // 阻止表单默认提交行为
        // alert(pebc_ajax.i18n.prevent_default_form_submission_behavior); // 使用i18n

        var plugin = $('#plugin-select').val();
        var request = $('#ticket-request').val();
        var nonce = $('#pebc_form_nonce').val(); // 获取 nonce 值

        $.post(pebc_ajax.ajax_url, {
            action: 'pebc_create_ticket',
            plugin: plugin,
            request: request,
            pebc_form_nonce: nonce // 传递 nonce
        }, function(response) {
            if (response.success) {
                // alert(pebc_ajax.i18n.ticket_created); // 使用i18n
                $('#ticket-request').val('');
                loadTickets();
            } else {
                alert(pebc_ajax.i18n.ticket_creation_failed); // 使用i18n
            }
        });
    });

    function loadTickets() {
        $.post(pebc_ajax.ajax_url, {
            action: 'pebc_get_tickets'
        }, function(response) {
            if (response.success) {
                var tickets = response.data;
                var $tbody = $('#pebc-tickets-table tbody');
                $tbody.empty();
                tickets.forEach(function(ticket) {
                    var $row = $('<tr></tr>');
                    ticket.plugin ?
                        $row.append('<td>' + ticket.plugin + '</td>') :
                        $row.append('<td> - </td>');
                    $row.append('<td>' + ticket.request + '</td>');
                    $row.append('<td>' + ticket.time + '</td>');
                    ticket.zip_file ? 
                    $row.append('<td><a href="' + ticket.zip_url + '" target="_blank">' + pebc_ajax.i18n.access_file + '</a> | <a href="#" class="delete-file" data-path="' + ticket.zip_url + '">' + pebc_ajax.i18n.delete_file + '</a></td>') : 
                    $row.append('<td> - </td>');
                    $row.append('<td><a href="'+ pebc_ajax.plugin_url +'/dist/index.html?plugin='+ encodeURIComponent(ticket.plugin) +'&path='+ encodeURIComponent(ticket.zip_file) +'&lang='+ encodeURIComponent(pebc_ajax.i18n.prompt_lang) +'&prompt='+ encodeURIComponent(ticket.request) + '' +'" target="_blank">' + pebc_ajax.i18n.jump + '</a> | <a href="#" class="delete-ticket" data-id="' + ticket.id + '">' + pebc_ajax.i18n.delete + '</a></td>');
                    $tbody.append($row);
                });

                $('.delete-ticket').on('click', function(e) {
                    e.preventDefault();
                    var ticketId = $(this).data('id');
                    var nonce = $('#pebc_form_nonce').val(); // 获取 nonce 值

                    if (confirm(pebc_ajax.i18n.are_you_sure_you_want_to_delete_this_ticket)) { // 使用i18n
                        $.post(pebc_ajax.ajax_url, {
                            action: 'pebc_delete_ticket',
                            ticket_id: ticketId,
                            pebc_form_nonce: nonce // 传递 nonce
                        }, function(response) {
                            if (response.success) {
                                // alert(pebc_ajax.i18n.ticket_deleted); // 使用i18n
                                loadTickets();
                            } else {
                                alert(pebc_ajax.i18n.failed_to_delete_ticket); // 使用i18n
                            }
                        });
                    }
                });

                $('.delete-file').on('click', function(e) {
                    e.preventDefault();
                    var filePath = $(this).data('path');
                    var nonce = $('#pebc_form_nonce').val(); // 获取 nonce 值
                    if (confirm(pebc_ajax.i18n.are_you_sure_you_want_to_delete_this_file)) { // 使用i18n
                        $.post(pebc_ajax.ajax_url, {
                            action: 'pebc_delete_file',
                            file_path: filePath,
                            pebc_form_nonce: nonce // 传递 nonce
                        }, function(response) {
                            if (response.success) {
                                alert(pebc_ajax.i18n.file_deleted); // 使用i18n
                                loadTickets();
                            } else {
                                alert(pebc_ajax.i18n.failed_to_delete_file+':'+response.data); // 使用i18n
                            }
                        });
                    }
                });
            }
        });
    }

    loadTickets(); // 页面加载时获取工单列表
});
