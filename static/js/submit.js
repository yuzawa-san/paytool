$(document).ready(function(){
    
    var $done = $("#done");
    var $inbox = $('#requestList tbody');
    
    var loadRequests = function(){
        $inbox.empty();
        ajaxHelper("GET","/api/request", {sheet_id: sheet_id}, function(r){
            $.each(r, function(){
                var $row = $("<tr>");
                $row.append("<td>"+this.from+"</td>");
                $row.append("<td>"+this.to+"</td>");
                $row.append("<td>"+this.value.toFixed(2)+"</td>");
                $row.append("<td>"+this.description+"</td>");
                $row.data('object', this);
                $inbox.append($row);
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
            });
        return false;
    });
    loadRequests();
});