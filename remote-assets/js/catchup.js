"use strict";
var catchup_page={
    player:null,
    keys:{
        focused_part:"date_program_selection",//and also, there is "date_program_selection"
        date_selection:0,
        program_selection:0
    },
    full_screen_timer:null,
    progressbar_timer:null,
    movie:{},
    dates:[],
    current_date_index:0,
    current_program_index:0,
    programmes: {},  // the programmes of the whole date
    full_screen_video:false,
    start_time:"",
    duration:0,
    init:function(movie, programmes){
        this.dates=[];
        this.programmes={};
        this.full_screen_video=false;
        
        $('#catchup').find('.player-container').css({
            position:'relative',
            left:0,
            top:0,
            height:'58.3vh',
            width:'58.3vw'
        });
        $('#catchup').find('.channel-information-container').show();
        $('#catchup-full-screen-information').hide();
        
        this.makeDateSortedProgramms(movie,programmes);
        $('#channel-image-container').find('img').attr("src",movie.stream_icon)
        $('#channel-name').text(movie.name);
        var dates=this.dates;
        var htmlContent='';
        var current_date=moment(new Date()).format('Y-MM-DD')
        var date_index=-1;
        dates.map(function(date, index){
            htmlContent+=
                '<div class="program-date-wrapper" date-date="'+date+'"' +
                '   onmouseenter="catchup_page.hoverDateItem('+index+')"'+
                '>'+
                moment(date).format('DD MMM. Y')+
                '</div>'
            if(date==current_date)
                date_index=index;
        })
        if(date_index==-1)
            date_index=0;
        $('#program-date-container').html(htmlContent);
        $($('.program-date-wrapper')[date_index]).addClass('active');
        this.keys.date_selection=date_index;
        this.current_date_index=date_index;
        this.changePrograms(current_date);
        var current_program_index=this.findCurrentProgram()
        this.changeCurrentProgram(date_index, current_program_index);
        this.keys.program_selection=current_program_index;
        this.current_program_index=current_program_index;
        this.changeChannelDateScrollPosition($('.program-date-wrapper')[catchup_page.keys.date_selection]);
        this.changeProgrammeScrollPosition($('.program-menu-item')[catchup_page.keys.program_selection]);

        var url;
        if(settings.playlist_type==="xtreme")
            url=getMovieUrl(movie.stream_id,'live','ts');
        else if(settings.playlist_type==="type1")
            url=movie.url;
        this.showMovie(url)
        current_route="catch-up";
        $("#catchup-page").show();
    },
    getProgramMovieUrl:function(){
        return api_host_url+'/streaming/timeshift.php?username='+user_name+'&password='+password+'stream='+this.movie.stream_id+'&start='+this.start_time+'&duration='+this.duration;
    },
    getDuration:function(){
        var date=this.dates[this.current_date_index];
        var program=this.programmes[date];
        this.duration=parseInt((program.stop_timestamp-program.start_timestamp)/60);
    },
    makeDateSortedProgramms:function(movie, programmes){
        this.movie=movie;
        var that=this;
        programmes.map(function(program){
            var exist=false;
            var exist_index=0;
            for(var i=0;i<that.dates.length;i++){
                if(program.start.includes(that.dates[i])){
                    exist=true;
                    exist_index=i;
                    break;
                }
            }
            if(exist)
                that.programmes[that.dates[exist_index]].push(program);
            else{
                var new_date=program.start.slice(0,10);
                that.dates.push(new_date);
                that.programmes[new_date]=[program];
            }
        })
        this.dates.sort();
    },
    hoverDateItem:function(index){
        var keys=this.keys;
        keys.focused_part="date_program_selection";
        var program_dates=$('.program-date-wrapper');
        keys.date_selection=index;
        $('.program-date-wrapper').removeClass('active');
        $(program_dates[keys.date_selection]).addClass('active');
        // $(program_dates[this.current_date_index]).addClass('active');
        this.changeChannelDateScrollPosition(program_dates[keys.date_selection]);
        var current_date=this.dates[keys.date_selection];
        this.changePrograms(current_date);
    },
    hoverProgramme:function(index){
        var keys=this.keys;
        keys.focused_part="date_program_selection";
        var menus=$('.program-menu-item');
        keys.program_selection=index;
        $('.program-menu-item').removeClass('active');
        $(menus[keys.program_selection]).addClass('active');
        this.changeProgrammeScrollPosition(menus[keys.program_selection]);
    },
    clickProgramme:function(){
        this.handleMenuClick();
    },
    changePrograms:function(date){
        var htmlContent='';
        var current_programmes=this.programmes[date];
        current_programmes.map(function(program, index){
            htmlContent+=
                '<div class="program-menu-item"'+
                '   onmouseenter="catchup_page.hoverProgramme('+index+')"'+
                '   onclick="catchup_page.clickProgramme()"'+
                '>'+
                '   <i class="fa fa-angle-right program-icon"></i>'+
                program.start.slice(11,16)+' - '+getAtob(program.title)+
                '</div>'
        })
        $('#program-menu-container').html(htmlContent);
        if(this.dates[this.current_date_index]!=date){
            this.keys.program_selection=0;
        }
        else{
            this.keys.program_selection=this.current_program_index;
        }
        $($('.program-menu-item')[this.keys.program_selection]).addClass('active');
        $("#program-menu-container").animate({ scrollTop: 0}, 10);
    },
    findCurrentProgram:function(){
        var date=moment(new Date());
        var date_string=date.format('Y-MM-DD HH:mm:ss');
        var programmes=this.programmes[date.format('Y-MM-DD')];
        var current_program;
        var index=-1;
        for(var i=0;i<programmes.length;i++){
            if(programmes[i].stop>=date_string){
                current_program=programmes[i];
                index=i;
                break;
            }
        }
        if(index==-1)
            index=0;
        return index;
    },
    changeCurrentProgram:function(date_index, program_index){
        var date=this.dates[date_index];
        var programme=this.programmes[date][program_index];

        $('#current-program-name').text(getAtob(programme.title));
        var current_program_time=moment(programme.start).format('MMM. DD HH:mm')+
            " - "+moment(programme.stop).format("HH:mm");
        $('#current-program-time').text(current_program_time);
        $('#catchup-program-title').text(programme.title!="" ? getAtob(programme.title) : "No Information");
        $('#catchup-program-description').text(programme.description!="" ? getAtob(programme.description) : "No Information");

        var programme_elements=$('.program-menu-item');
        $('.program-menu-item').removeClass('active');
        $(programme_elements[program_index]).addClass('active');
    },
    zoomInOut:function(){
        if(!this.full_screen_video){
            $('#catchup').find('.player-container').css({
                position:'relative',
                left:0,
                top:0,
                height:'58.3vh',
                width:'58.3vw'
            });
            media_player.full_screen_state=0;
            $('#catchup-full-screen-information').hide();
            $('#catchup').find('.channel-information-container').show();
            this.keys.focused_part="date_program_selection"
        }
        else{
            $('#catchup').find('.player-container').css({
                position:'fixed',
                left:0,
                top:0,
                height:'100vh',
                width:'100vw'
            });
            media_player.full_screen_state=1;
            catchup_page.full_screen_video=true;
            var date=this.dates[this.current_date_index];
            $('#catchup-full-screen-channel-name').html(
                this.movie.num+' : '+this.movie.name
            );
            var programmes=this.programmes[date];
            var next_program='No Information';
            var program_description="No Information";
            if(typeof programmes[this.current_program_index+1]!='undefined')
                next_program=getAtob(programmes[this.current_program_index+1].title);
            var current_program=getAtob(programmes[this.current_program_index].title);
            if(programmes[this.current_program_index].description!=="")
                program_description=getAtob(programmes[this.current_program_index].description);

            $('#catchup-full-screen-current-program').text(current_program);
            $('#catchup-full-screen-next-program').text(next_program);

            $('#catchup-full-screen-program-name').text(current_program);
            $('#catchup-full-screen-program-description').text(program_description);

            $('#catchup').find('.channel-information-container').hide();
            $('#live-channel-button-container').hide();
            $('#catchup').find('.video-skin').hide();
            clearTimeout(catchup_page.full_screen_timer);
            $('#catchup-full-screen-information').slideDown();
            this.full_screen_timer=setTimeout(function(){
                $('#catchup-full-screen-information').slideUp();
            },5000)
            this.keys.focused_part="full_screen";
        }
        setTimeout(function () {
            try{
                media_player.setDisplayArea();
            }catch (e) {
                console.log('setDisplayArea error on catchup zoom:', e);
            }
        },250)
    },
    showMovie:function(url){
        try{
            media_player.close();
        }catch(e){
        }
        if(url===""){
            this.getDuration();
            url=this.getProgramMovieUrl();
        }
        try{
            media_player.init("catchup-page-video","catchup")
            setTimeout(function(){
                try{
                    media_player.setDisplayArea();
                }catch(e){
                    console.log(e);
                }
            }, 250);
        }catch (e) {
            console.log(e);
        }
        try{
            media_player.playAsync(url);
        }catch (e) {
            console.log(e);
        }
    },
    changeChannelDateScrollPosition:function(element) {
        var padding_left=parseInt($('#program-date-container').css('padding-left').replace('px',''));
        var parent_width=parseInt($('#program-date-container').css('width').replace('px',''));
        var child_position=$(element).position();
        var element_width=parseInt($(element).css('width').replace('px',''));;
        if(child_position.left+element_width>=parent_width){
            $('#program-date-container').animate({ scrollLeft: '+='+(child_position.left+element_width-parent_width)}, 10);
        }
        if(child_position.left-padding_left<0){
            $('#program-date-container').animate({ scrollLeft: '+='+(child_position.left-padding_left)}, 10);
        }
    },
    changeProgrammeScrollPosition:function(element) {
        var parent_element=$('#program-menu-container');
        var padding_top=parseInt($(parent_element).css('padding-top').replace('px',''));
        var parent_height=parseInt($(parent_element).css('height').replace('px',''));
        var child_position=$(element).position();
        var element_height=parseInt($(element).css('height').replace('px',''));;
        if(child_position.top+element_height>=parent_height){
            $(parent_element).animate({ scrollTop: '+='+(child_position.top+element_height-parent_height)}, 10);
        }
        if(child_position.top-padding_top<0){
            $(parent_element).animate({ scrollTop: '+='+(child_position.top-padding_top)}, 10);
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==="date_program_selection"){  // if channel item clicked
            if(this.current_date_index!=keys.date_selection || this.current_program_index!=keys.program_selection){
                this.current_date_index=keys.date_selection;
                this.current_program_index=keys.program_selection;
                this.changeCurrentProgram(keys.date_selection, keys.program_selection);
                var current_date=this.dates[this.current_date_index];
                var current_program=this.programmes[current_date];
                this.start_time=moment(current_program.start_time).format('Y-MM-DD:HH-mm')
                this.showMovie('');
            }
            else{ // zoom in or out
                this.full_screen_video=true;
                this.zoomInOut();
            }
        }
        else if(keys.focused_part==="full_screen"){ // if full screen mode, if click ok button,
            this.keys.focused_part="channel_selection";
            this.full_screen_video=false;
            this.zoomInOut();
        }
    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        if(keys.focused_part==="date_program_selection"){ // if search back button container is active now
            var menus=$('.program-menu-item');
            keys.program_selection+=increment;
            if(keys.program_selection>=menus.length)
            {
                keys.program_selection=menus.length-1;
            }
            if(keys.program_selection<0){
                keys.program_selection=0;
            }
            $('.program-menu-item').removeClass('active');
            $(menus[keys.program_selection]).addClass('active');
            this.changeProgrammeScrollPosition(menus[keys.program_selection]);
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        if(keys.focused_part==="date_program_selection"){ // if it is focused on channel selection part
            var program_dates=$('.program-date-wrapper');
            keys.date_selection+=increment;
            if(keys.date_selection<0){
                keys.date_selection=0
                return;
            }
            if(keys.date_selection>=program_dates.length){
                keys.date_selection=program_dates.length-1;
                return;
            }
            $('.program-date-wrapper').removeClass('active');
            $(program_dates[keys.date_selection]).addClass('active');
            // $(program_dates[this.current_date_index]).addClass('active');
            this.changeChannelDateScrollPosition(program_dates[keys.date_selection]);
            var current_date=this.dates[keys.date_selection];
            this.changePrograms(current_date);
        }
        if(keys.focused_part==="search_back_selection"){ // if focus is in search wrapper
            keys.search_back_selection+=increment;
            if(keys.search_back_selection>1){
                keys.search_back_selection=0;
                $('#channel-page-search-back-button-wrapper').find('.search-back-button').removeClass('active');
                keys.focused_part="right_screen_part";
                keys.right_screen_part=0;
                var channel_action_btns=$('.channel-action-btn');
                $(channel_action_btns[0]).addClass('active');
                return;
            }
            if(keys.search_back_selection<0){
                keys.search_back_selection=0;
            }
            $('#channel-page-search-back-button-wrapper').find('.search-back-button').removeClass('active');
            $($('#channel-page-search-back-button-wrapper').find('.search-back-button')[keys.search_back_selection]).addClass('active');
        }

        else if(keys.focused_part==="right_screen_part"){  // in small screen view mode,
            keys.right_screen_part+=increment;
            if(keys.right_screen_part<0){
                keys.right_screen_part=0;
                $('.channel-action-btn').removeClass('active');
                keys.focused_part="channel_selection"; // focus will go to menu part
                var channel_menus=$('.channel-menu-item');
                $(channel_menus[keys.channel_selection]).addClass('active');
                return;
            }
            if(keys.right_screen_part>1)
                keys.right_screen_part=1;
            var channel_action_btns=$('.channel-action-btn');
            $('.channel-action-btn').removeClass('active');
            $(channel_action_btns[keys.right_screen_part]).addClass('active');
        }
    },
    HandleKey:function(e) {
        // var focused_part=catchup_page.key'focused_part'];
        var focused_part=this.keys.focused_part;
        switch (e.keyCode) {
            case tvKey.RIGHT:
                catchup_page.handleMenuLeftRight(1)
                break;
            case tvKey.LEFT:
                catchup_page.handleMenuLeftRight(-1)
                break;
            case tvKey.DOWN:
                catchup_page.handleMenusUpDown(1);
                break;
            case tvKey.UP:
                catchup_page.handleMenusUpDown(-1);
                break;
            case tvKey.ENTER:
                catchup_page.handleMenuClick();
                break;
            case tvKey.RETURN:
                if(focused_part==="date_program_selection"){
                    $("#catchup-page").hide();
                    media_player.close();
                    channel_page.reEnter();
                }
                if(focused_part==="full_screen"){
                    this.full_screen_video=false;
                    this.zoomInOut();
                }
        }
    }
}
