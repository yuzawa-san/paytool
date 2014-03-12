$(document).ready(function(){
    
    var $done = $("#done");
    var $inbox = $('#requestList tbody');
    var $editor = $('#requestEditor');
    var editing = 0;
    
    var loadRequests = function(){
        $('.editRequest').off('click');
        $('.removeRequest').off('click');
        $inbox.empty();
        ajaxHelper("GET","/api/request", {sheet_id: sheet_id}, function(r){
            $.each(r, function(){
                var $row = $("<tr>");
                $row.append("<td>"+this.from+"</td>");
                $row.append("<td>"+this.to+"</td>");
                $row.append("<td>"+this.value.toFixed(2)+"</td>");
                $row.append("<td>"+this.description+"</td>");
                $row.append("<td><button class='btn editRequest btn-warning btn-xs'><span class='glyphicon glyphicon-pencil'></span> edit</button> <button class='btn removeRequest btn-danger btn-xs'><span class='glyphicon glyphicon-minus'></span> delete</button></td>");
                $row.data('object', this);
                $inbox.append($row);
            });
            $('.editRequest').on('click',function(){
                var row = $(this).parent().parent().data('object');
                $('#editor-from', $editor).val(row.from);
                $('#editor-to', $editor).val(row.to);
                $('#editor-value', $editor).val(row.value);
                $('#editor-description', $editor).val(row.description);
                editing = row.id;
                $editor.modal('show');
            });
            $('.removeRequest').on('click',function(){
                if(!confirm("Are you sure you wish to remove the selected requests? This cannot be undone.")){
                    return;
                }
                var $row = $(this).parent().parent();
                ajaxHelper("DELETE","/api/request", {sheet_id: sheet_id, id: $row.data('object').id}, function(r){
                    $row.remove();
                     _gaq.push(['_trackEvent', 'PaymentAction', 'RemoveRequest']);
                });
            });
        });
    };
    $('#request-form').submit(function(){
        var $from = $("#from");
        var $to = $("#to");
        var $value = $("#value");
        var $description = $("#description");
        var from = $from.val();
        var to = $to.val();
        var value = $value.val();
        var description = $description.val();
        var senders = from.split(/,\s*/);
        var recipients = to.split(/,\s*/);
        if(senders.length > 1 && recipients.length > 1){
            alert("Only the sender OR the recipient may be a group of people. Both may not be groups.");
            return false;
        }
        ajaxHelper("POST",'/api/request',
            {sheet_id: sheet_id, to:to, from:from, value:value, description:description},
            function(r){
                $from.val('').focus();
                $to.val('');
                $value.val(0);
                $description.val('');
                $done.show();
                window.setTimeout(function(){
                    $done.fadeOut();
                },3000);
                loadRequests();
                 _gaq.push(['_trackEvent', 'PaymentAction', 'AddRequest']);
            });
        return false;
    });
    
    $('#editor-save').click(function(){
        var from = $('#editor-from', $editor).val();
        var to = $('#editor-to', $editor).val();
        var value = $('#editor-value', $editor).val();
        var description = $('#editor-description', $editor).val();
        var senders = from.split(/,\s*/);
        var recipients = to.split(/,\s*/);
        if(senders.length > 1 && recipients.length > 1){
            alert("Only the sender OR the recipient may be a group of people. Both may not be groups.");
            return false;
        }
        
        ajaxHelper("PUT",'/api/request',
            {sheet_id: sheet_id, id:editing, to:to, from:from, value:value, description:description},
            function(r){
                window.location.reload();
            });
    });
    loadRequests();
});