"use strict";
var image_page={
    keys:{
        menu_selection:0,
        focused_part:''
    },
    init:function(image_index){
        var images=storage_page.image_files;
        console.log(image_index,images );
        current_route = "image-page";
        var html='';
        images.map(function(item, index){
            var url=item.file.toURI();
            html+=
                '<li class="loaded">'+
                '<a href="'+url+'">'+
                '<img src="'+url+'" title="">'+
                '</a>'+
                '</li>'

        })
        $('#image-gallery').html(html);

        $('#image-gallery').photobox('a',
            {
                thumbs:true,
                time:20000,
                autoplay:true,
                rotatable: false,
            },
            callback
        );

        window._photobox.history.load;
        $($('#image-gallery').find('li a')[image_index]).trigger('click');

        function callback(){
            console.log('callback for loaded content:');
        };
        // home_page.Exit();
        $('#storage-page').hide();
        $('#image-page').show();
        current_route='image-page';
    },
    goBack:function(){
        // home_page.reEnter();
        // current_route="home-page";
        $('#image-gallery').photobox('destroy');
        $('#image-page').hide();
        $('#storage-page').show();
        current_route='storage-page';
        // $('#home-page').show();
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {

        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {

        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {

        }
    },
    HandleKey:function (e) {
        if(this.is_loading)
            return;
        switch (e.keyCode) {
            case tvKey.RETURN:
                this.goBack();
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
        }
    }
}
