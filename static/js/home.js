$(document).ready(function(){
    var $table = $('#sheets tbody');
    
    var editor = function(done, name, private, acceptsRequests){
        var $title = $('#editor-title');
        var $name = $('#editor-name');
        var $private = $('#editor-private');
        var $requests = $('#editor-requests');
        var $modal = $('#editor');
        var $save = $('#editor-save');
        if(name){ // editr
            $title.text('Edit Sheet Settings');
            $name.val(name);
            $private.val(private ? '1': '0');
            $requests.val(acceptsRequests ? '1': '0');
        }else{ // new
            $title.text('New Sheet');
            $name.val('');
            $private.val('1');
            $requests.val('0');
        }
        $save.off('click');
        $modal.modal('show');
        $save.on('click', function(){
            done($name.val(), $private.val(), $requests.val());
        });
    };
    
    ajaxHelper("GET","/api/sheet",{},function(r){
        for(var i in r){
            var $row = $("<tr>");
            var $edit = $("<button class='btn btn-info btn-xs'><span class='glyphicon glyphicon-pencil'> Settings</button>").click(function(){
                var data = $(this).parent().data('data');
                var oldName = data.name;
                var oldPrivate = data.private;
                var oldAcceptsRequests = data.acceptsRequests;
                var rowID = data.id;
                editor(function(name, private, acceptsRequests){
                    ajaxHelper("PUT","/api/sheet", {id: rowID, name: name, private: private, acceptsRequests: acceptsRequests}, function(r){
                        window.location.reload();
                    });
                }, oldName, oldPrivate, oldAcceptsRequests);
            });
            var $remove = $("<button class='btn btn-danger btn-xs' title='Remove'><span class='glyphicon glyphicon-trash'></button>").click(function(){
                var data = $(this).parent().data('data');
                var rowID = data.id;
                if(confirm("Are you sure? This is irreversible.")){
                    _gaq.push(['_trackEvent', 'SheetAction', 'RemoveSheet']);
                    ajaxHelper("DELETE","/api/sheet", {id: rowID}, function(r){
                        window.location.reload();
                    });
                }
            });
            $row.append("<td><a href='/sheet/"+r[i].id+"'>"+r[i].name+"</a></td>");
            $row.append($("<td>").html(r[i].private ? "<span class='glyphicon glyphicon-user'></span> Private" : "<span class='glyphicon glyphicon-link'></span> With Link"));
            $row.append($("<td>").data('data',r[i]).append($edit, " ", $remove));
            $table.append($row);
        }
    });
    
    $('#new').click(function(){
        editor(function(name, private, acceptsRequests){
            _gaq.push(['_trackEvent', 'SheetAction', 'AddSheet']);
            ajaxHelper("POST","/api/sheet", {name: name, private: private, acceptsRequests: acceptsRequests}, function(r){
                window.location = "/sheet/"+r.id;
            });
        });
    });
});