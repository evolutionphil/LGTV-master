"use strict";
var home_page={
    keys:{
        focused_part:"menu_selection", // or, "search part", "slider part", "sub menu part", "search_value"
        menu_selection:0, // the index of selected menu,
        search_back_selection: 0,  //0 means, back selected,
        submenu_selection:0, // the index of submenu selection
        grid_selection:0, // the index of selected grid item
        slider_selection:0, // the index of selected slider
        slider_item_index:0, // the index of selected slider item
        refresh_modal:0,
        turn_off_modal:0,
        setting_modal:0,
        hide_category_modal:0,
        parent_account_modal:0,
        hide_category_movie_type:"",
        parent_confirm_modal:0,
        theme_modal:0,
        playlist_modal:0,
        prev_focus:'',
        sort_selection:0,
        live_sort_selection:0,
        language_selection:0,
        lock_account_selection:0,
        clear_cache_selection:0,
        featured_setting_selection:0,
        epg_setting_selection:0
    },
    submenu_opened:false,

    grid_items:[],
    abs_row_position:0,
    count_per_row:5,
    display_row_count:5,
    display_count:50,

    movie_grids_extended:0,
    preview_url:'',
    current_preview_seek:0,
    current_preview_id:-1,  // the movie id of current playing,
    current_preview_type:'', // this would be 'live' or 'movie'
    player:null,
    theme_modal_options:[],
    playlist_modal_options:[],
    menu_items:[],
    submenu_items:[],
    slider_wrappers:[],
    slider_items:[],
    setting_options:[],
    parent_operation_items:$('.parent-operation-item'),
    hide_category_options:[],
    refresh_options:[],
    parent_confirm_options:$('.parent-confirm-option'),
    movie_grid_doms:[],
    turn_off_options:[],
    search_back_options:[],
    movies:[],
    is_drawing:false,
    current_render_count:0,
    render_count_increment:50,
    lock_account_doms:$('.lock_account_btn'),
    featured_setting_doms:$('.featured-setting-btn'),
    clear_cache_btns:$('#clear-cache-modal .modal-btn-1'),
    epg_setting_items:$('.epg-setting-item'),
    epg_items_rendered:false,

    init:function(){
        this.slider_items=[];
        $('#app').show();
        var  htmlContents="";
        var live_favourite_movie=LiveModel.getRecentOrFavouriteMovies('favourite');
        live_favourite_movie.map(function(movie, index){
            htmlContents+=home_page.makeSliderMovieItemElement(movie,'live',0, index)
        })
        $('#favourite_tv_wrapper').html(htmlContents);

        var vod_featured_movies=[];
        if(settings.show_featured_movies==='on')
            vod_featured_movies=VodModel.getLatestMovies();

        var first_play_video="";
        if(typeof live_favourite_movie[0]!='undefined'){
            if(settings.playlist_type==="xtreme")
                first_play_video=getMovieUrl(live_favourite_movie[0].stream_id, 'live', 'ts');
            else
                first_play_video=live_favourite_movie[0].url;
            home_page.current_preview_id=live_favourite_movie[0].stream_id;
            home_page.current_preview_type='live';
        }
        else if(typeof vod_featured_movies[0]!='undefined'){
            if(settings.playlist_type==="xtreme")
                first_play_video=getMovieUrl(vod_featured_movies[0].stream_id, 'movie', vod_featured_movies[0].container_extension);
            else
                first_play_video=vod_featured_movies[0].url;
            home_page.current_preview_id=vod_featured_movies.stream_id;
            home_page.current_preview_type='movie';
        }
        current_route='home-page';

        $('#home-page-slider-container').slick({
            autoplay: true,
            arrows:false,
            dots:true,
            variableWidth:false,
            autoplaySpeed:5000
        });
        try{
            media_player.init("home-page-video-preview",'home-page');
            media_player.setDisplayArea();
        }catch (e) {
        }
        if(first_play_video!==''){
            this.preview_url=first_play_video
            setTimeout(function () {
                media_player.playAsync(first_play_video);
            },0)
        }
        else{
            // $('#home-page .video-error').show();
        }
        this.theme_modal_options=$('.theme-modal-option');
        this.menu_items=$('#menu-wrapper').find('.menu-item');
        this.slider_wrappers=$('.movie-slider-wrapper');
        this.slider_items.push($('#favourite_tv_wrapper .movie-item-wrapper'));
        this.renderFeaturedMovies();

        this.setting_options=$('#settings-modal .modal-operation-menu-type-3');
        this.refresh_options=$('.refresh-modal-option');
        this.turn_off_options=$('.turn-off-option');
        this.search_back_options=$('#search-back-button-wrapper .search-back-button');

        this.live_sort_selection_doms=$('.live-sort-item');
        var html='';
        languages.map(function (item,index) {
            html+=
                '<div class="modal-operation-menu-type-3 language-item modal-operation-menu-type-4" ' +
                '   data-sort_key="default" ' +
                '   onclick="home_page.selectLanguage(\''+item.code+'\','+index+')"'+
                '   onmouseenter="home_page.hoverLanguage('+index+')"'+
                '   data-language="'+item.code+'"'+
                '   data-word_code="'+item.code+'"'+
                '>\n' +
                item.name+
                '</div>'
        })
        $('#select-language-body').html(html);
        home_page.language_doms=$('.language-item');

        home_page.doms_translated = $("*").filter(function() {
            return $(this).data("word_code") !== undefined;
        });
        home_page.changeDomsLanguage();
        home_page.sort_selection_doms=$('#sort-modal-wrapper .sort-modal-item');
    },
    goBack:function () {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "slider_selection":
                $(this.slider_items[0]).removeClass('active');
                $(this.slider_items[1]).removeClass('active');
                if(!this.submenu_opened){
                    keys.focused_part="menu_selection";
                    $(this.menu_items[keys.menu_selection]).addClass('active');
                }
                else{  // if submenu opened
                    keys.focused_part="submenu_selection";
                    $(this.submenu_items[keys.submenu_selection]).addClass('active');
                    if(keys.menu_selection==0)
                        current_movie_type='live-tv';
                }
                break;
            case "grid_selection":
                var movie_grids = $('#movie-grids-container').find('.movie-item-wrapper');
                $(movie_grids).removeClass('active');
                keys.grid_selection=0;
                keys.focused_part="submenu_selection";
                var submenus=$('#sub-menus-wrapper').find('.menu-item');
                $('#sub-menus-wrapper').find('.menu-item').removeClass('active');
                $(submenus[keys.submenu_selection]).addClass('active');
                break;
            case "parent_account_modal":
            case "refresh_modal":
            case "setting_modal":
            case "lock_account_selection":
            case "featured_setting_selection":
            case "epg_setting_selection":
            case "hide_category_modal":
            case "turn_off_modal":
            case "theme_modal":
            case "clear_cache_selection":
            case "playlist_modal":
                $('.modal').modal('hide');
                this.hoverToMainMenu(keys.menu_selection);
                break;
            case "parent_confirm_modal":
                $('#parent-confirm-modal').modal('hide');
                keys.focused_part="submenu_selection";
                break;
            case "menu_selection":
                $('#turn-off-modal').modal('show');
                keys.focused_part="turn_off_modal";
                keys.turn_off_modal=0;
                $('#turn-off-modal').find('button').removeClass('active');
                $($('#turn-off-modal').find('button')[0]).addClass('active');
                break;
            case "sort_selection":
                $('#sort-modal-container').hide();
                keys.focused_part="sort_button";
                break;
            case "live_sort_selection":
                $('#live-sort-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            case "language_selection":
                $('#language-select-modal').modal('hide');
                keys.focused_part="menu_selection";
                break;
            default:
                this.goToMainPage();
        }
    },
    Exit:function(){
        $('#home-page').css({height:0});
        try{
            media_player.close();
        }catch (e) {
        }
    },
    reEnter:function(){
        $('#home-page').css({height:'100vh'});
        current_route="home-page";
        var that=this;
        if(current_movie_type==="live-tv"){
            if(this.preview_url){
                media_player.init("home-page-video-preview",'home-page');
                setTimeout(function () {
                    try{
                        media_player.setDisplayArea();
                    }catch (e) {
                    }
                    try{
                        media_player.playAsync(that.preview_url);
                    }catch (e) {
                    }
                },1000)
            }
        }
        if(this.submenu_opened) {  // this will be the case that live tv, movies, series, youtube play menu clicked and its categories showing., in this case, we need to update favourite, recent movies count
            if(current_movie_type==='movies' || current_movie_type==='series' || current_movie_type==='live-tv')
                this.updateRecentFavouriteMoviesCount();
        }
    },
    renderFeaturedMovies: function () {
        var vod_featured_movies=[];
        if(settings.show_featured_movies==='on'){
            vod_featured_movies=VodModel.getLatestMovies();
            $('#featured-movies-container').show();
        }else {
            $('#featured-movies-container').hide();
        }
        var htmlContents="";
        vod_featured_movies.
        map(function(movie, index){
            htmlContents+=home_page.makeSliderMovieItemElement(movie,'movie',1, index)
        })
        $('#featured_movie_wrapper').html(htmlContents);
        if(this.slider_items.length==1)
            this.slider_items.push($('#featured_movie_wrapper .movie-item-wrapper'));
        else
            this.slider_items[1]=$('#featured_movie_wrapper .movie-item-wrapper');
    },
    makeSliderMovieItemElement:function(movie, movie_type, slider_index, grid_index){
        var fall_back_image="images/default_icon.jpeg";
        var extension='ts';
        if(movie_type==="movie"){
            fall_back_image="images/404.png";
            extension=movie.container_extension;
        }
        var channel_class=movie_type=='live' ? ' channel' : '';
        var htmlContent=
            '<div class="movie-item-container">\
                <div class="movie-item-wrapper '+channel_class+'"\
                    data-movie_type="'+movie_type+'"\
                    data-stream_id="'+movie.stream_id+'" data-extension="'+extension+'"\
                    data-slider_index="'+slider_index+'"\
                    data-slider_item_index="'+grid_index+'"\
                    onmouseenter="home_page.changeMovieGridItem(this)"\
                    onclick="home_page.showPreviewVideo(this)"\
                >\
                    <div class="movie-item-thumbernail">\
                        <div class="movie-item-thumbernail-img-wrapper">\
                            <img class="movie-item-thumbernail-img" src="'+movie.stream_icon+'" onerror="this.src=\''+fall_back_image+'\'"> \
                        </div> \
                        <div class="movie-thumbernail-title-wrapper">\
                            <p class="movie-thumbernail-title">'+movie.name+'</p>\
                        </div> \
                    </div>\
                </div>\
            </div>'
        return htmlContent;
    },
    makeGridMovieItemElement:function(movie,index,current_movie_type){
        var img=movie.stream_icon;
        var fall_back_image="images/404.png"
        var id_key="stream_id";
        var current_model=VodModel;
        if(current_movie_type==="series")
        {
            img=movie.cover;
            fall_back_image="images/series.png";
            id_key="series_id";
            current_model=SeriesModel;
        }
        var current_render_count=this.current_render_count;
        var htmlContent=
            '<div class="movie-item-container">\
                <div class="movie-item-wrapper position-relative"\
                    data-channel_id="'+movie[id_key]+'" data-index="'+(current_render_count+index)+'"\
                    onmouseenter="home_page.hoverMovieGridItem(this)"\
                    onclick="home_page.clickMovieGridItem(this)"\
                >'+
                (current_model.favourite_ids.includes(movie[id_key]) ? '<div class="favourite-badge"><i class="fa fa-star"></i></div>' : '')+
                    '<img class="movie-grid-item-image movie-grid-item-image-'+current_render_count+'" src="'+img+'" onerror="this.src=\''+fall_back_image+'\'">\
                    <div class="movie-grid-item-title-wrapper position-relative">\
                        <p class="movie-thumbernail-title position-absolute">'+movie.name+'</p>\
                    </div>\
                </div>\
            </div>'
        return htmlContent;
    },
    changeMovieGridItem:function(targetElement){
        var slider_index=$(targetElement).data('slider_index');
        var slider_item_index=$(targetElement).data('slider_item_index');
        $(this.menu_items).removeClass('active');
        var parent_element=this.slider_wrappers[slider_index]
        var keys=this.keys;
        keys.focused_part="slider_selection";
        keys.slider_item_index=slider_item_index;  // the index of current,
        keys.slider_selection=slider_index;
        $('.movie-item-wrapper').removeClass('active');
        var current_element=this.slider_items[slider_index][slider_item_index];
        $(current_element).addClass('active');
        var movie_item_container= $(current_element).closest('.movie-item-container');
        this.changeMovieScrollPosition(parent_element,movie_item_container)
    },
    showSubMenus:function (targetElement, movie_type, menu_index) {
        // $(targetElement).addClass('active');
        current_movie_type=movie_type;
        if(movie_type==='movies')
            current_movie_categories=VodModel.getCategories(false, true);
        if(movie_type==='series')
            current_movie_categories=SeriesModel.getCategories(false, true);
        if(movie_type==="movies" || movie_type==="series"){
            try{
                media_player.close();
            }catch (e) {
            }
            $('#home-page-movie-logo').show();
            if(platform==='samsung')
                $('#home-page-video-preview').hide();
            else
                $('#home-page-video-preview-lg').hide();
            $('#home-video-error').hide();
            $('#home-page-movie-logo').closest('.player-container').css({background:"none"});
        }
        if(movie_type==='live-tv'){
            current_movie_categories=LiveModel.getCategories(false, true);
        }

        var htmlContents='';
        if(movie_type!='youtube') {
            current_movie_categories.map(function(category, index){
                htmlContents+=
                    '<div class="menu-item home-category-menu-item" data-category_id="'+category.category_id+'"\
                        onclick="home_page.submenuClick('+index+')"\
                        onmouseenter="home_page.hoverToSubMenu('+index+')"\
                    >\
                        <span class="menu-item-category-name">'+category.category_name+'</span>\
                        <span class="menu-item-movies-count">'+category.movies.length+'</span>\
                    </div>'
            });
        }
        else {
            if(youtube_playlists.length>0) {
                youtube_playlists.map(function(playlist, index){
                    htmlContents+=
                        '<div class="menu-item"\
                            onclick="home_page.showYoutubePlayPage()"\
                            onmouseenter="home_page.hoverToSubMenu('+index+')"\
                        >'+
                            playlist.playlist_name+
                        '</div>'
                });
            }
        }
        $('#sub-menus-wrapper').html(htmlContents);
        $('#menu-wrapper').hide();
        $('#sub-menu-container').show()
        $('#sub-menus-wrapper').scrollTop(0);
        this.submenu_items=$('#sub-menus-wrapper').find('.menu-item');
        this.movie_grids_extended=0;
        this.submenu_opened=true;
        current_category={};
        var current_index=0;
        this.hoverToSubMenu(current_index);
        if(movie_type!=='live-tv' && movie_type!=='youtube')
            this.submenuClick(current_index);
    },
    showSetting:function () {
        $('#settings-modal').modal('show');
        this.hoverSettingModal(0);
    },
    showRefreshModal:function(){
        $('#refresh-modal').modal('show');
        this.hoverRefreshModal(0);
    },
    showYoutubePlayPage:function () {
        var keys=this.keys;
        var playlist_index=keys.submenu_selection;
        var playlist=youtube_playlists[playlist_index];
        if(!playlist.items || playlist.items.length==0){
            // var api_key="AIzaSyAW5Q2i0PgCteY6hAqIC8AQV-EYHRCTZDE";
            var api_key=youtube_api_key;
            var nextPageToken=playlist.nextPageToken ? playlist.nextPageToken : '';
            var url="https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&part=id&part=snippet&maxResults=50&playlistId="+playlist.playlist_id+"&key="+api_key+"&pageToken="+nextPageToken;
            var that=this;
            showLoader(true);
            this.is_drawing=true;
            $.ajax({
                method:'get',
                headers: {
                    accepts:'application/json'
                },
                url:url,
                success:function (result) {
                    showLoader(false);
                    that.is_drawing=false;
                    console.log(result)
                    try{
                        var items=result.items;
                        var video_items=[];
                        items.map(function (item){
                            var snippet=item.snippet;
                            if(snippet.title!='Deleted video'){
                                if(!snippet.thumbnails.medium)
                                    console.log(snippet.thumbnails);
                                var icon
                                try {
                                    icon=snippet.thumbnails.medium.url;
                                }catch (e) {
                                    icon='images/404.png';
                                }
                                video_items.push({
                                    title:snippet.title,
                                    description:snippet.description,
                                    icon:icon,
                                    videoId:snippet.resourceId.videoId
                                })
                            }
                        })
                        playlist.items=video_items;
                        if(result.nextPageToken)
                            playlist.nextPageToken=result.nextPageToken;
                        if(result.pageInfo)
                            playlist.totalResults=result.pageInfo.totalResults;
                        youtube_page.init(playlist);
                    }catch (e) {
                        showLoader(false);
                        that.is_loading=false;
                        showToast('Sorry',"Error caused while fetching playlist contents");
                    }
                },
                error:function (error) {
                    showLoader(false);
                    that.is_loading=false;
                    showToast('Sorry',"Error caused while fetching playlist contents");
                }
            })
        } else
            youtube_page.init(playlist);
    },
    showParentConfirmModal:function(){
        $('#parent-confirm-password').val("");
        $('#parent-confirm-modal').modal('show');
        this.hoverParentConfirmModal(0);
    },
    confirmParentPassword:function(){
        $('#parent-confirm-password-error').hide();
        var typed_parent_password=$('#parent-confirm-password').val();
        if(parent_account_password===typed_parent_password){
            $('#parent-confirm-modal').modal('hide');
            this.keys.focused_part=this.keys.prev_focus;
            this.showCategoryContent();
        }
        else{
            $('#parent-confirm-password-error').text("Password does not match").show();
            return;
        }
    },
    cancelParentPassword:function(){
        $('#parent-confirm-modal').modal('hide');
        this.keys.focused_part=this.keys.prev_focus;
    },
    showParentControlModal:function(){
        $('#parent-account-valid-error').hide();
        $('#settings-modal').modal('hide');
        $('#parent-control-modal').modal('show');
        this.hoverParentModal(0);
    },
    resetParentAccount:function(){
        $('#parent-account-valid-error').hide();
        var origin_parent_password=$('#current_parent_password').val();
        var new_password=$('#new_parent_password').val();
        var new_password_confirm=$('#new_parent_password_confirm').val();
        if(origin_parent_password!=parent_account_password){
            $('#parent-account-valid-error').text("Current password does not match").slideDown();
            return;
        }
        if(new_password!=new_password_confirm){
            $('#parent-account-valid-error').text("Password does not match").slideDown();
            return;
        }
        if(lock==1){
            $('#parent-account-valid-error').text("Sorry, your device is locked, please unlock your device in Settings/UserAccount ").slideDown();
            return;
        }
        parent_account_password=new_password;
        localStorage.setItem(storage_id+'parent_account_password', parent_account_password);
        $.ajax({
            method:'post',
            url:panel_url+'/updateParentAccountPassword',
            data:{
                mac_address:mac_address,
                password:new_password
            },
            success:function () {
            }
        })
        $('#parent-control-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    cancelResetParentAccount:function(){
        $('#parent-control-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    showHideCategoryModal:function(movie_type){
        this.hide_category_movie_type=movie_type;
        $('#settings-modal').modal('hide');
        var categories=LiveModel.getCategories(true,false);
        if(movie_type==="movie")
            categories=VodModel.getCategories(true,false);
        if (movie_type==="series")
            categories=SeriesModel.getCategories(true,false);
        var htmlContent='';
        categories.map(function(category, index){
            htmlContent+=
                '<div class="hide-category-modal-option hide-category-option"\
                    onmouseenter="home_page.hoverHideCategoryModal('+index+')"\
                    onclick="home_page.handleMenuClick()"\
                >\
                    <input class="hide-category-checkbox" type="checkbox" name="checkbox"\
                        id="hide-category-item-'+category.category_id+'" '+(!category.is_hide ? 'checked' : '')+' value="'+category.category_id+'">\
                    <label for="hide-category-item-'+category.category_id+'">'+category.category_name+'</label>\
                </div>'
        });
        $('#hide-modal-categories-container').html(htmlContent);
        this.hide_category_options=$('.hide-category-option');
        $('#hide-category-modal').modal('show');
        this.hoverHideCategoryModal(0);
    },
    saveHiddenCategories:function(){
        var movie_type=this.hide_category_movie_type;
        var current_model=LiveModel;
        if(movie_type==="movie")
            current_model=VodModel;
        if(movie_type==="series")
            current_model=SeriesModel;
        var hidden_categories_elements=$('#hide-category-modal').find('input[type=checkbox]:not(:checked)');
        var category_ids=[];
        hidden_categories_elements.map(function(index,item){
            category_ids.push($(item).val());
        })
        current_model.saveHiddenCategories(category_ids);
        $('#hide-category-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    showAllCategories:function(){
        var movie_type=this.hide_category_movie_type;
        var current_model=LiveModel;
        if(movie_type==="movie")
            current_model=VodModel;
        if(movie_type==="series")
            current_model=SeriesModel;
        $('#hide-category-modal').modal('hide');
        this.keys.focused_part="menu_selection";
        current_model.showAllCategories();
    },
    cancelHideCategories:function(){
        $('#hide-category-modal').modal('hide');
        this.keys.focused_part="menu_selection";
    },
    showUserAccounts:function(){
        $('#settings-modal').modal('hide');
        $('#user-account-mac-address').text(mac_address);
        $('#user-account-expire-date').text(expire_date>"2200-" ? 'Forever' : expire_date);
        $('#user-account-is_trial').text(is_trial==0 || is_trial==1 ? 'Trial' : 'Active');
        $('#lock-state-message').removeClass('error').removeClass('visible');
        $('#user-account-modal').modal('show');
        $('input[name="lock_account"][value="'+lock+'"]').prop('checked',true);
        this.hoverLockAccountBtn(lock==0 ? 0 : 1);
    },
    showFeaturedSetting:function () {
        $('#settings-modal').modal('hide');
        $('#featured-setting-state-message').removeClass('error').removeClass('visible');
        $('#featured-movies-setting-modal').modal('show');
        $('input[name="feature_setting"][value="'+settings.show_featured_movies+'"]').prop('checked',true);
        this.hoverFeaturedSettingBtn(settings.show_featured_movies==='on' ? 0 : 1);
    },
    showEpgSetting: function () {
        if(!this.epg_items_rendered) {
            var html='';
            for(var i=0;i<53; i++) {  // utc -12 ~ utc 14
                html+=
                    '<div class="modal-operation-menu-type-3 epg-setting-item"\
                        onmouseenter="home_page.hoverEpgSettingItem('+i+')"\
                        onclick="home_page.saveEpgSetting()"\
                    >'+(i*0.5-12)+' Hours</div>'
            }
            $('#epg-setting-items-container').html(html);
            this.epg_setting_items=$('.epg-setting-item')
            this.epg_items_rendered=true;
        }
        var epg_selection=(settings.epg_time_difference+12)*2;
        $('#epg-setting-modal').modal('show');
        this.hoverEpgSettingItem(epg_selection);
    },
    showThemeModal:function(){
        $('#settings-modal').modal('hide');
        $('#theme-modal').modal('show');
        this.hoverThemeModal(0);
    },
    pickTheme:function(index){
        settings.saveSettings('bg_img_index',index,'');
        changeBackgroundImage();
        this.keys.focused_part="menu_selection";
        $('#theme-modal').modal('hide');
    },
    showPlayListModal:function(){
        var playlist_url_index=settings.playlist_url_index;
        var htmlContents='';
        playlist_urls.map(function(playlist, index){
            htmlContents+=
                '<div class="modal-operation-menu-type-3 playlist-modal-option text-center '+(index===playlist_url_index ? 'current' : '')+'"\
                    onclick="home_page.pickPlayListUrl('+index+')"\
                    onmouseenter="home_page.hoverPlaylistModal('+index+')"\
                >\
                    Portal '+(index+1)+
                    '<span class="playlist-state-icon">\
                        <i class="fa fa-play"></i>\
                    </span> \
                </div>'
        })
        $('#playlist-items-container').html(htmlContents);
        this.playlist_modal_options=$('.playlist-modal-option');
        $('#playlist-modal').modal('show');
        $('#settings-modal').modal('hide');
        this.hoverPlaylistModal(0);
    },
    pickPlayListUrl:function(index){
        settings.saveSettings('playlist_url_index', index,'');
        $('#playlist-modal').modal('hide');
        if(current_route==="home-page"){ // show refresh modal
            if(settings.playlist_url!=playlist_urls[index]){  // if url has changed
                settings.playlist_url=playlist_urls[index];
                parseM3uUrl();
                this.showRefreshModal();
            }
            else{
                this.keys.focused_part="menu_selection";
            }
        }
        else{  // if from login page
            settings.playlist_url=playlist_urls[index];
            parseM3uUrl();
            login_page.proceed_login();
        }
    },
    showCacheConfirmModal: function (){
        $('#settings-modal').modal('hide');
        $('#clear-cache-modal').modal('show');
        this.hoverCacheConfirmModal(0);
    },
    clearCache: function (){
        current_route = 'login-page';
        $('#clear-cache-modal').modal('hide');
        var local_storage_keys=[];
        Object.keys(localStorage).map(function (key){
            if(key.includes(storage_id) && !key.includes('terms_accepted'))
                local_storage_keys.push(key);
        })
        local_storage_keys.map(function (key){
            localStorage.removeItem(key);
        })
        settings.resetDefaultValues();
        this.reloadPage()
    },
    showLiveChannelSort:function(){
        var keys=this.keys;
        keys.focused_part="live_sort_selection";
        keys.live_sort_selection=0;
        var live_sort_selection_doms=this.live_sort_selection_doms;
        live_sort_selection_doms.map(function (index, item) {
            if($(item).data('sort_key')==settings.live_sort){
                keys.live_sort_selection=index;
            }
        })
        $(live_sort_selection_doms).removeClass('active');
        $(live_sort_selection_doms[keys.live_sort_selection]).addClass('active');
        $('#settings-modal').modal('hide');
        $('#live-sort-modal').modal('show');
    },
    changeLiveSort:function(sort_key, index){
        $(this.live_sort_selection_doms[index]).addClass('active');
        settings.saveSettings('live_sort',sort_key,'');
        this.goBack();
    },
    showLanguages:function(){
        $('#settings-modal').modal('hide');
        var keys=this.keys;
        var language_doms=this.language_doms;
        language_doms.map(function (index,item) {
            var language=$(item).data('language');
            if(language==settings.language){
                keys.language_selection=index;
            }
        })
        $('#language-select-modal').modal('show');
        this.hoverLanguage(keys.language_selection);
    },
    selectLanguage:function(code, index){
        settings.saveSettings('language',code,'');
        var keys=this.keys;
        keys.language_selection=index;
        $(this.language_doms).removeClass('active');
        $(this.language_doms[index]).addClass('active');
        $('#language-select-modal').modal('hide');
        keys.focused_part="menu_selection";
        this.changeDomsLanguage();
    },
    hoverLanguage:function(index){
        var keys=this.keys;
        keys.focused_part="language_selection";
        keys.language_selection=index;
        $(this.language_doms).removeClass('active');
        $(this.language_doms[index]).addClass('active');
    },
    changeDomsLanguage:function(){
        this.getSelectedLanguageWords(settings.language);
        var doms_translated=this.doms_translated;
        doms_translated.map(function (index, item) {
            var word_code=$(item).data('word_code');
            if(typeof current_words[word_code]!='undefined'){
                $(item).text(current_words[word_code]);
            }
        })
    },
    getSelectedLanguageWords:function(code){
        var words=[];
        for(var i=0;i<languages.length;i++){
            if(languages[i].code===code){
                words=languages[i].words;
                break;
            }
        }
        current_words=words;
    },
    goToMainPage:function(){
        $(this.slider_items[0]).removeClass('active');
        $(this.slider_items[1]).removeClass('active');
        var keys=this.keys;
        $('.search-back-button').removeClass('active');
        $('#sub-menu-container').hide()
        var menus=this.menu_items;
        $(menus[keys.menu_selection]).addClass('active');
        $('#menu-wrapper').show();
        this.keys.focused_part="menu_selection";
        $("#home-page-right-part-content-2").hide();
        $("#home-page-right-part-content-1").css({height:'100vh'});
        this.submenu_opened=false;
        this.movie_grids_extended=0;

        $('#home-page-movie-logo').hide();
        $('#home-page-movie-logo').closest('.player-container').css({background:"#111"});
        // $('#search-button-wrapper').hide();  // hide back button
        if(platform==='samsung')
            $('#home-page-video-preview').show();
        else
            $('#home-page-video-preview-lg').show();

        if(current_movie_type==="series" || current_movie_type==="movies"){
            if(this.preview_url){
                var that=this;
                setTimeout(function () {
                    media_player.init("home-page-video-preview",'home-page');
                    try{
                        media_player.setDisplayArea();
                    }catch (e) {
                    }
                    media_player.playAsync(that.preview_url);
                },500)
            }
        }
    },
    showSortKeyModal:function(){
        $('#settings-modal').modal('hide');
        $('#sort-modal-container').show();
        this.hoverSortKey(0);
    },
    focusSortButton:function(){
        var keys=this.keys;
        keys.focused_part="sort_button";
        $('#sort-button-container').addClass('active');
        $('#movie-grids-container .movie-item-wrapper').removeClass('active');
        $('.search-back-button').removeClass('active');
        $(this.submenu_items).removeClass('active');
    },
    changeSortKey:function(key){
        var keys=this.keys;
        var current_sort_key=current_movie_type==='movies' ? 'vod_sort' : 'series_sort';
        $('#sort-modal-container').hide();
        var category=current_movie_categories[keys.submenu_selection];
        if(settings[current_sort_key]!=key && category.category_id!='all'){
            settings.saveSettings(current_sort_key,key,'');
            this.movies=getSortedMovies(current_category.movies,key)
            $('#movie-grids-container').html('');
            this.current_render_count=0;
            this.renderCategoryContent();
            if(current_category.movies.length>0){
                keys.focused_part="grid_selection";
                keys.grid_selection=0;
                $('#sort-button-container').removeClass('active');
            }
            $('#sort-button').text($(this.sort_selection_doms[keys.sort_selection]).text());
            $('#movie-grids-container').scrollTop(0);
        }else{
            // keys.focused_part="grid_selection";
            // keys.grid_selection=0;
            // $('#sort-button-container').removeClass('active');
            // $('#movie-grids-container .movie-item-wrapper').removeClass('active');
            // $($('#movie-grids-container .movie-item-wrapper')[0]).addClass('active');
            this.hoverMovieGridItem(this.movie_grid_doms[0]);
        }
    },
    renderCategoryContent:function(){
        if(this.current_render_count<this.movies.length){
            this.is_drawing=true;
            showLoader(true);
            var that=this;
            var  htmlContents='';
            this.movies.slice(this.current_render_count, this.current_render_count+this.render_count_increment).map(function(movie, index){
                htmlContents+=home_page.makeGridMovieItemElement(movie,index, current_movie_type);
            })
            $('#movie-grids-container').append(htmlContents);
            this.movie_grid_doms=$('#movie-grids-container .movie-item-wrapper');
            this.current_render_count+=this.render_count_increment;
            setTimeout(function () {
                that.is_drawing=false;
                showLoader(false);
            },1000)
        }
    },
    showCategoryContent:function(){
        var keys=this.keys;
        if(current_movie_type==='movies' || current_movie_type==='series'){
            this.movie_grids_extended=1;
            this.is_drawing=false;
            this.current_render_count=0;
            $("#home-page-right-part-content-1").css({height:0});
            $("#home-page-right-part-content-2").show();
            $('#current-category-title').text(current_category.category_name);
            var current_sort_key=current_movie_type==='movies' ? settings.vod_sort : settings.series_sort;
            $('#movie-grids-container').html('');
            $('#movie-grids-container').scrollTop(0);
            var movies=current_category.movies;
            if(current_category.category_id==='all'){
                movies=[];
                current_movie_categories.map(function (item){
                    if(!checkForAdult(item,'category',[]) && !item.is_hide && item.category_id!='recent' && item.category_id!='favourite' && item.category_id!='resume')
                        movies=movies.concat(item.movies);
                })
                current_sort_key='added';
                $(this.submenu_items[0]).find('.menu-item-movies-count').text(movies.length);
            }
            this.movies=getSortedMovies(movies, current_sort_key);
            if(this.movies.length>0){
                this.renderCategoryContent();
                $('#movie-grids-container').scrollTop(0);
                // $($('#sub-menus-wrapper .menu-item')).removeClass('active');
                // keys.focused_part="grid_selection";
                // keys.grid_selection=0;
                // var movie_grids=$('#movie-grids-container .movie-item-wrapper');
                // $(movie_grids[0]).addClass('active');
            }
            this.sort_selection_doms.map(function (index, item) {
                var sort_key=$(item).data('sort_key');
                if(sort_key===current_sort_key)
                    keys.sort_selection=index;
            })
            $(this.sort_selection_doms).removeClass('active');
            $(this.sort_selection_doms[keys.sort_selection]).addClass('active');
            $('#sort-button').text($(this.sort_selection_doms[keys.sort_selection]).text());
        }
        else if(current_movie_type==='live-tv'){
            if(current_category.movies.length>0){
                this.Exit();
                channel_page.init(0,false);
            }
            else{
                showToast("Sorry","No Movie exists in this category");
            }
        }
    },
    submenuClick:function (submenu_index) {
        var keys=this.keys;
        keys.prev_focus='submenu_selection';
        var targetElement=this.submenu_items[submenu_index];
        var category_id=$(targetElement).data('category_id');
        current_category=getCurrentMovieFromId(category_id,current_movie_categories,'category_id');
        $(this.submenu_items).removeClass('active');
        $(this.submenu_items[submenu_index]).addClass('active');
        keys.submenu_selection=submenu_index;
        var category_name=current_category.category_name.toLowerCase();
        if(category_name.includes('xxx') ||  category_name.includes('adult') || category_name.includes('porn')  || current_category.parent_id==1){
            this.showParentConfirmModal();
            return;
        }
        this.showCategoryContent();
    },
    reloadPage:function(){
        $('#refresh-modal').modal('hide');
        $('#app').hide();
        try{
            media_player.close();
        }catch (e) {
        }
        $('#home-page-slider-container').slick('unslick');
        $('#login-container').show();
        home_page.keys.focused_part="menu_selection";
        home_page.keys.menu_selection=0;
        var menus=$('#menu-wrapper').find('.menu-item');
        $(menus).removeClass('active');
        $(menus[0]).addClass('active');
        $('.menu-item').removeClass('active');
        $($('.menu-item')[0]).addClass('active');
        current_route="login";
        login_page.login();
    },
    closeApp:function(){
        $('#turn-off-modal').modal('hide');
        closeApp()
    },
    closeTurnoffModal:function(){
        if(current_route==='home-page'){
            this.goBack();
        }
        else if(current_route==='login'){
            $('#turn-off-modal').modal('hide');
            var network_display=$('#network-issue-container').css('display');
            if(network_display!=='block')
                login_page.keys.focused_part="playlist_selection";
            else
                login_page.keys.focused_part="network_issue_btn";
        }
    },
    showSearchPage:function(){
        this.Exit();
        search_page.init('home-page');
    },
    saveLockState:function(){
        $('#lock-state-message').removeClass('error').removeClass('visible');
        var keys=this.keys;
        var lock1=keys.lock_account_selection;
        $('input[name="lock_account"][value="'+lock1+'"]').prop('checked',true);
        var that=this;
        $.ajax({
            method:'post',
            url:panel_url+'/saveLockState',
            data:{
                mac_address:mac_address,
                lock:lock1
            },
            success:function () {
                $('#lock-state-message').text('Account lock state saved successfully').addClass('visible');
                lock=lock1;
                setTimeout(function () {
                    $('#lock-state-message').removeClass('visible');
                    if(keys.focused_part==='lock_account_selection')
                        that.goBack();
                },3000)
            },
            error:function () {
                $('#lock-state-message').text('Sorry, some issue caused, please try again later').addClass('error').addClass('visible');
            }
        })
    },
    saveFeaturedSetting:function () {
        $('#featured-setting-state-message').removeClass('error').removeClass('visible');
        var keys=this.keys;
        var featured_setting=$(this.featured_setting_doms[keys.featured_setting_selection]).find('input').val();
        $('input[name="feature_setting"][value="'+featured_setting+'"]').prop('checked',true);
        settings.saveSettings('show_featured_movies',featured_setting);
        $('#featured-setting-state-message').text('Featured setting updated successfully').addClass('visible');
        if(featured_setting==='off') {
            if(keys.slider_selection==1) {  // it means, previous slider selction was on favourite movies
                keys.slider_selection=0;
                keys.slider_item_index=0;
            }
            this.slider_items.slice(1,1);
            $('#featured_movie_wrapper').html('');
            $('#featured-movies-container').hide();
        }else {
            $('#featured-movies-container').show();
            this.renderFeaturedMovies();
        }
    },
    saveEpgSetting: function () {
        var keys=this.keys;
        var epg_time=keys.epg_setting_selection*0.5-12;
        settings.saveSettings('epg_time_difference', epg_time,'');
        this.goBack();
    },
    showStorages: function () {
        /* Success event handler */
        storage_page.init();
    },
    updateRecentFavouriteMoviesCount: function () {
        var favourite_category_index=1, recent_category_index=current_movie_categories.length-1;
        if(current_movie_type==='live-tv')
            favourite_category_index=0;
        var favourite_count=current_movie_categories[favourite_category_index].movies.length;
        var recent_count=current_movie_categories[recent_category_index].movies.length;
        $(this.submenu_items[favourite_category_index]).find('.menu-item-movies-count').text(favourite_count);
        $(this.submenu_items[recent_category_index]).find('.menu-item-movies-count').text(recent_count);
        if(current_movie_type==='movies' || current_movie_type==='series') {
            for(var i=0;i<2;i++) {
                if(current_movie_categories[i].category_id==='resume') {
                    $(this.submenu_items[i]).find('.menu-item-movies-count').text(current_movie_categories[i].movies.length);
                    break;
                }
            }
        }
    },
    hoverSortKey:function(index){
        var keys=this.keys;
        keys.sort_selection=index;
        keys.focused_part='sort_selection';
        $(this.sort_selection_doms).removeClass('active');
        $(this.sort_selection_doms[index]).addClass('active');
    },
    hoverToMainMenu:function(menu_index){
        $(this.menu_items).removeClass('active');
        $(this.menu_items[menu_index]).addClass('active');
        this.keys.menu_selection=menu_index;
        this.keys.focused_part='menu_selection';
        $('.movie-item-wrapper').removeClass('active');
    },
    hoverToSubMenu:function(submenu_index){
        var keys=this.keys;
        $(this.submenu_items).removeClass('active');
        $(this.slider_items[0]).removeClass('active');
        $(this.slider_items[1]).removeClass('active');
        var movie_grids=$('#movie-grids-container').find('.movie-item-wrapper');
        $(movie_grids).removeClass('active');
        $('.search-back-button').removeClass('active');
        $(this.submenu_items[submenu_index]).addClass('active');
        keys.submenu_selection=submenu_index;
        keys.focused_part="submenu_selection";
    },
    hoverSearchBackBtn:function(index){
        var keys=this.keys;
        keys.focused_part="search_back_selection";
        keys.search_back_selection=index;
        $('.search-back-button').removeClass('active');
        $(this.movie_grid_doms).removeClass('active');
        $(this.submenu_items).removeClass('active');
        $('#sort-button-container').removeClass('active');
        $($('.search-back-button')[keys.search_back_selection]).addClass('active');
    },

    hoverSettingModal:function (setting_index) {
        var keys=this.keys;
        keys.focused_part='setting_modal';
        keys.setting_modal=setting_index;
        $(this.setting_options).removeClass('active');
        $(this.setting_options[keys.setting_modal]).addClass('active');
        moveScrollPosition($('#setting-items-container'),this.setting_options[keys.setting_modal],'vertical',false);
    },
    hoverParentModal:function (parent_index) {
        var keys=this.keys;
        keys.focused_part="parent_account_modal";
        keys.parent_account_modal=parent_index;
        $(this.parent_operation_items).removeClass('active');
        $(this.parent_operation_items[parent_index]).addClass('active');
    },
    hoverHideCategoryModal:function (category_index) {
        if(category_index<0)
            category_index=this.hide_category_options.length+category_index;
        var keys=this.keys;
        keys.hide_category_modal=category_index;
        keys.focused_part="hide_category_modal";
        $(this.hide_category_options).removeClass('active');
        $(this.hide_category_options[category_index]).addClass('active');
    },
    hoverThemeModal:function (index) {
        var keys=this.keys;
        keys.focused_part='theme_modal';
        keys.theme_modal=index;
        $(this.theme_modal_options).removeClass('active');
        $(this.theme_modal_options[keys.theme_modal]).addClass('active');
    },
    hoverRefreshModal:function (index) {
        var keys=this.keys;
        $(this.refresh_options).removeClass('active');
        keys.focused_part='refresh_modal';
        keys.refresh_modal=index;
        $(this.refresh_options[index]).addClass('active');
    },
    hoverPlaylistModal:function (index) {
        var keys=this.keys;
        keys.focused_part="playlist_modal";
        keys.playlist_modal=index;
        $(this.playlist_modal_options).removeClass('active');
        $(this.playlist_modal_options[index]).addClass('active');
        moveScrollPosition($('#playlist-items-container'), this.playlist_modal_options[index],'vertical',false);
    },
    hoverParentConfirmModal:function(index){
        var keys=this.keys;
        keys.focused_part="parent_confirm_modal";
        keys.parent_confirm_modal=index;
        $(this.parent_confirm_options).removeClass('active');
        $(this.parent_confirm_options[index]).addClass('active');
    },
    hoverMovieGridItem:function(targetElement){
        var index=$(targetElement).data('index');
        var keys=this.keys;
        keys.grid_selection=index;
        keys.focused_part="grid_selection";
        $(this.category_dom_items).removeClass('active');
        $('#sort-button-container').removeClass('active');
        $(this.submenu_items).removeClass('active');
        $(this.movie_grid_doms).removeClass('active');
        $(this.movie_grid_doms[index]).addClass('active');
        $('.search-back-button').removeClass('active');

        var movie_grids=this.movie_grid_doms;

        var movie_element= $(movie_grids[keys.grid_selection]).closest('.movie-item-container');
        moveScrollPosition($('#movie-grids-container'),movie_element,'vertical',false)
        if(index>=this.current_render_count-5){
            this.renderCategoryContent();
        }
    },
    hoverTurnOffModal:function (index) {
        if(current_route==='home-page'){
            this.keys.turn_off_modal=index;
            $(this.turn_off_options).removeClass('active');
            $(this.turn_off_options[index]).addClass('active');
        }
        else if(current_route==='login-page'){
            var keys=login_page.keys;
            keys.turn_off_modal=index;
            var buttons=$('#turn-off-modal').find('button');
            $(buttons).removeClass('active');
            $(buttons[keys.turn_off_modal]).addClass('active');
        }
    },
    hoverLockAccountBtn:function(index){
        var keys=this.keys;
        keys.focused_part='lock_account_selection';
        keys.lock_account_selection=index;
        $(this.lock_account_doms).removeClass('active');
        $(this.lock_account_doms[index]).addClass('active');
    },
    hoverFeaturedSettingBtn: function (index) {
        var keys=this.keys;
        keys.focused_part='featured_setting_selection';
        keys.featured_setting_selection=index;
        $(this.featured_setting_doms).removeClass('active');
        $(this.featured_setting_doms[index]).addClass('active');
    },
    hoverEpgSettingItem: function (index) {
        var keys=this.keys;
        keys.focused_part='epg_setting_selection';
        $(this.epg_setting_items).removeClass('active');
        $(this.epg_setting_items[index]).addClass('active');
        moveScrollPosition($('#epg-setting-items-container'), this.epg_setting_items[index],'vertical',false);
        keys.epg_setting_selection=index;
    },
    hoverCacheConfirmModal:function (index){
        var keys=this.keys;
        keys.focused_part="clear_cache_selection";
        keys.clear_cache_selection=index;
        $(this.clear_cache_btns).removeClass('active');
        $(this.clear_cache_btns[index]).addClass('active');
    },
    clickMovieGridItem:function(targetElement){
        if(current_movie_type==="movies")
            this.showVodSummary();
        if(current_movie_type==="series")
            this.showSeriesSummary();
    },
    KeyToMovies:function(){   // from menu, entering movies part
        var keys=this.keys;
        $(this.menu_items).removeClass('active');
        $(this.submenu_items).removeClass('active');
        $('.search-back-button').removeClass('active');
        keys.focused_part="slider_selection";
        keys.slider_item_index=0;  // the first movie item of movie slider,
        if(this.slider_items[0].length>0)  // from featured, and favorite movies, at least one item would have movies
            keys.slider_selection=0;
        else
            keys.slider_selection=1;
        $(this.slider_items[keys.slider_selection][keys.slider_item_index]).addClass('active');
    },
    MoveKeyOnMovies:function(increment){  // move movie inside slider by left, right key
        var keys=this.keys;
        $(this.slider_items[0]).removeClass('active');
        $(this.slider_items[1]).removeClass('active');
        $(this.menu_items).removeClass('active');
        $(this.submenu_items).removeClass('active');

        var movie_items=this.slider_items[keys.slider_selection];
        keys.slider_item_index+=increment;
        if(keys.slider_item_index<0)  // this means, now cursor is the first position and so, it needs to move to left panel
        {
            keys.slider_item_index=0;
            if(!this.submenu_opened){
                keys.focused_part="menu_selection";  // focused would go on to menus part
                $(this.menu_items[keys.menu_selection]).addClass('active');
            }
            else{
                keys.focused_part="submenu_selection";  // focused would go on to menus part
                $(this.submenu_items[keys.submenu_selection]).addClass('active');
                if(keys.menu_selection==0)
                    current_movie_type='live-tv';
            }
            return;
        }
        if(keys.slider_item_index>=movie_items.length)
            keys.slider_item_index=movie_items.length-1;

        var movie_item_container= $(movie_items[keys.slider_item_index]).closest('.movie-item-container');
        this.changeMovieScrollPosition(this.slider_wrappers[keys.slider_selection],movie_item_container)
        $(movie_items[keys.slider_item_index]).addClass('active');
    },
    changeCurrentMovieSlider:function(increment) {  // move movie slider by up and down button
        var keys=this.keys;
        var movie_containers=$('.movie-slider-wrapper');
        var movie_items=$(movie_containers[keys.slider_selection]).find('.movie-item-wrapper');
        var prev_slider_movie_position_left=$(movie_items[keys.slider_item_index]).closest('.movie-item-container').position().left;  // the left position of previous slider's movie
        var original_slider_selection=keys.slider_selection;
        keys.slider_selection+=increment;
        if(keys.slider_selection<0)
            keys.slider_selection=movie_containers.length-1;
        if(keys.slider_selection>=movie_containers.length)
            keys.slider_selection=0;
        if($(movie_containers[keys.slider_selection]).children().length>0){  // if another movies slider has movies;
            $('.movie-item-wrapper').removeClass('active');
            var selected_movie_items=$(movie_containers[keys.slider_selection]).find('.movie-item-wrapper');
            var min_distance=500000;
            for(var i=0;i<selected_movie_items.length;i++){  // find the nearest element
                var current_position=$(selected_movie_items[i]).closest('.movie-item-container').position().left;
                var distance=Math.abs(current_position-prev_slider_movie_position_left);
                if(distance<=min_distance){
                    keys.slider_item_index=i;
                    min_distance=distance;
                }else{
                    break;
                }
            }
            $(selected_movie_items[keys.slider_item_index]).addClass('active');
        }
        else{
            keys.slider_selection=original_slider_selection;
        }
    },
    changeMovieScrollPosition:function(parent_element, movie_element) {
        var parent_width=$(parent_element).width();
        var padding_left=parseInt($(parent_element).css('padding-left').replace('px',''));
        var padding_right=parseInt($(parent_element).css('padding-right').replace('px',''));

        var child_position=$(movie_element).position();
        var element_width=200;
        if(child_position.left+element_width>=parent_width-padding_right){
            $(parent_element).animate({ scrollLeft: '+='+(child_position.left+element_width-parent_width+padding_right)}, 10);
        }
        if(child_position.left<0 || child_position.left-padding_left<0){
            $(parent_element).animate({ scrollLeft: '+='+(child_position.left-padding_left)}, 10);
        }
    },
// ****************************** End Movie Related Part *******************************//

    showPreviewVideo:function(targetElement){
        var slider_index=$(targetElement).data('slider_index'), slider_item_index=$(targetElement).data('slider_item_index');
        var keys=this.keys;
        keys.focused_part="slider_selection";
        keys.slider_selection=slider_index;
        $(this.slider_items[0]).removeClass('active');
        $(this.slider_items[1]).removeClass('active');
        $(this.menu_items).removeClass('active');
        $(this.submenu_items).removeClass('active');
        $('.search-back-button').removeClass('active');
        $(this.slider_items[slider_index][slider_item_index]).addClass('active');

        var current_movie_item=this.slider_items[slider_index][slider_item_index];
        var movie_type=$(current_movie_item).data('movie_type');
        var stream_id=$(current_movie_item).data('stream_id');
        if(stream_id==this.current_preview_id && movie_type==this.current_preview_type){  // if selected again current previewing movie, then will show full screen video in home page
            media_player.close();
            this.Exit();
            if(movie_type==="movie"){
                current_movie_type="movies";
                current_movie=getCurrentMovieFromId(stream_id,VodModel.getLatestMovies(),'stream_id');
                vod_series_player.makeEpisodeDoms('home-page');
                vod_series_player.init(current_movie,"movies","home-page");
            }
            else{  // if current preview is live tv, go to live tv
                current_category=LiveModel.getRecentOrFavouriteCategory('favourite');
                channel_page.full_screen_video=true;
                channel_page.init(stream_id, true);
            }
        }
        else{
            this.current_preview_id=stream_id;
            this.current_preview_type=movie_type;
            var extension=$(current_movie_item).data('extension');
            var url;
            if(settings.playlist_type==='xtreme')
                url=getMovieUrl(stream_id, movie_type, extension);
            else{
                var movie;
                if(extension==='ts'){
                    movie=LiveModel.getMovieFromId(stream_id);
                    url=movie.url;
                }
                else{
                    movie=VodModel.getMovieFromId(stream_id);
                    url=movie.url;
                }
            }
            this.preview_url=url;
            try{
                media_player.close();
            }catch(e){
                console.log(e);
            }
            try{
                media_player.init("home-page-video-preview",'home-page');
                media_player.setDisplayArea();
            }catch (e) {
            }
            try{
                media_player.playAsync(url);
            }catch (e) {

            }
        }
    },
    showVodSummary:function(){
        var keys=this.keys;
        current_movie=this.movies[keys.grid_selection];
        vod_summary_page.init('home-page');
    },
    showSeriesSummary:function(){
        var keys=this.keys;
        current_series=this.movies[keys.grid_selection];
        this.Exit();
        series_summary_page.init('home-page');
    },
    addVodOrSeriesToFavourite:function(){
        if(this.movie_grids_extended==1){  // will only work if grid extended, that is, movie or series selected
            var keys=this.keys;
            var movie=this.movies[keys.grid_selection];
            var current_model=current_movie_type==='movies' ? VodModel : SeriesModel;
            var movie_key=current_movie_type==='movies' ? 'stream_id' : "series_id";
            var domElement=$('#movie-grids-container .movie-item-container')[keys.grid_selection];
            var is_favourite=$(domElement).find('.favourite-badge').length>0 ? true : false;
            if(!is_favourite) {
                current_model.addRecentOrFavouriteMovie(movie, 'favourite');
            }else{
                current_model.removeRecentOrFavouriteMovie(movie[movie_key], 'favourite');
                if(current_category.category_id==='favourite'){
                    $(domElement).remove();
                    var grid_doms=$('#movie-grids-container .movie-item-wrapper');
                    if(grid_doms.length==0){
                        keys.focused_part="search_back_selection";
                        keys.search_back_selection=1;
                        $('#search-button-wrapper').addClass('active');
                    }else{
                        if(keys.grid_selection>=grid_doms.length)
                            keys.grid_selection--;
                        $(grid_doms[keys.grid_selection]).addClass('active');
                    }
                }
            }
            this.updateRecentFavouriteMoviesCount();
        }
    },
    removeMovieFromFeaturedList:function(){
        var keys=this.keys;
        if(keys.focused_part==="slider_selection"){
            var movie_containers=$('.movie-slider-wrapper');
            if(keys.slider_selection==1){ // if focus is on featured movie
                var movie_items=$(movie_containers[keys.slider_selection]).find('.movie-item-wrapper');
                if(keys.slider_item_index>=0 && movie_items.length>0){
                    var stream_id_to_delete=$(movie_items[keys.slider_item_index]).data('stream_id');
                    $(movie_items[keys.slider_item_index]).closest('.movie-item-container').remove();
                    var featured_movies=VodModel.removeFromFavourite(stream_id_to_delete);
                    if(featured_movies.length>=10){
                        var dom=home_page.makeSliderMovieItemElement(featured_movies[9],'movie');
                        $('#featured_movie_wrapper').append(dom);
                    }
                    movie_items=$(movie_containers[keys.slider_selection]).find('.movie-item-wrapper');
                    if(movie_items.length<keys.slider_item_index){
                        keys.slider_item_index--;
                        if(keys.slider_item_index<0){
                            keys.slider_item_index=0;
                        }
                    }
                    movie_items.map(function (index, item) {
                        $(item).data('slider_item_index',index);
                    })
                    $(movie_items[keys.slider_item_index]).addClass('active');
                    this.slider_items[1]=$('#featured_movie_wrapper .movie-item-wrapper');
                }
            }
        }
    },
    moveToOtherCategory:function(){
        var keys=this.keys;
        var next_movie_type="movies";
        if(keys.focused_part==="grid_selection" || keys.focused_part==="slider_selection"
            || (keys.focused_part==="submenu_selection" && current_movie_type==="live-tv")){ // go to movies section
            next_movie_type="movies";
        }
        if((keys.focused_part==="submenu_selection" || keys.focused_part==="grid_selection") && current_movie_type==="movies"){
            next_movie_type="series";
        }
        if((keys.focused_part==="submenu_selection" || keys.focused_part==="grid_selection") && current_movie_type==="series"){
            next_movie_type="live-tv";
            $('#home-page-movie-logo').hide();
            $('#home-page-movie-logo').closest('.player-container').css({background:"#111"});
            // $('#search-button-wrapper').hide();  // hide back button
            if(platform==='samsung')
                $('#home-page-video-preview').show();
            else
                $('#home-page-video-preview-lg').show();
            setTimeout(function(){
                media_player.play(); // play preview player again.
            },1000)
        }
        var menu_item=$('#menu-wrapper').find('*[data-type='+next_movie_type+']')[0]
        $(menu_item).trigger('click');
        $("#home-page-right-part-content-2").hide();
        $("#home-page-right-part-content-1").css({height:'100vh'});
    },

    handleMovieGridKeyEvent:function(increment) {
        var keys=this.keys;
        var movie_grids=$('#movie-grids-container').find('.movie-item-wrapper');
        $(movie_grids).removeClass('active');
        if(increment==-1 && keys.grid_selection % 5==0){
            keys.focused_part="submenu_selection";
            var menus=$('#sub-menus-wrapper').find('.menu-item');
            $(menus).removeClass('active');
            $(menus[keys.submenu_selection]).addClass('active');
            return;
        }
        keys.grid_selection+=increment;
        if(keys.grid_selection<0)
        {
            keys.grid_selection=0;
            if(increment==-1){  // if only left key clicked, will select search button as default
                keys.focused_part="search_back_selection";
                keys.search_back_selection=1;
                $('#search-button-wrapper').addClass('active');
            }
            if(increment<-1){  // if up down button clicked
                keys.focused_part="sort_button";
                $('#sort-button-container').addClass('active');
            }
            return;
        }
        if(keys.grid_selection>movie_grids.length-1)
        {
            keys.grid_selection=movie_grids.length-1;
            $(movie_grids[keys.grid_selection]).addClass('active');
            return;
        }
        $(movie_grids[keys.grid_selection]).addClass('active');
        var movie_element= $(movie_grids[keys.grid_selection]).closest('.movie-item-container');
        var move_amount=moveScrollPosition($('#movie-grids-container'),movie_element,'vertical',false)
        if(keys.grid_selection>=this.current_render_count-5){
            this.renderCategoryContent();
        }

    },
    handleMenusUpDown:function(increment) {
        var keys=this.keys;
        var menus=[];
        if(keys.focused_part==="slider_selection"){ // if current key is on movie slider
            this.changeCurrentMovieSlider(increment);
        }
        if(keys.focused_part==="grid_selection")
            this.handleMovieGridKeyEvent(5*increment)
        if(keys.focused_part==="menu_selection"){  // if menus wrapper is active now
            menus=$('#menu-wrapper').find('.menu-item');
            keys.menu_selection+=increment;
            if(keys.menu_selection>=menus.length)
                keys.menu_selection=menus.length-1;
            if(keys.menu_selection<0)
                keys.menu_selection=0;
            if(platform!='samsung' && keys.menu_selection==5) {
                if(increment>0)
                    keys.menu_selection=6;
                else
                    keys.menu_selection=4;
            }
            $('.menu-item').removeClass('active');
            $(menus[keys.menu_selection]).addClass('active');
            moveScrollPosition($('#menu-container'),menus[keys.menu_selection],'vertical',false);
        }
        else if(keys.focused_part==="submenu_selection"){ // if sub menus wrapper is selected
            menus=$('#sub-menus-wrapper').find('.menu-item');
            keys.submenu_selection+=increment;
            if(keys.submenu_selection<0)
            {
                keys.focused_part="search_back_selection"
                keys.search_back_selection=0;
                keys.submenu_selection=0;
                $($('.search-back-button')[keys.search_back_selection]).addClass('active');
                $('#sub-menus-wrapper').find('.menu-item').removeClass('active');
                return;
            }
            if(keys.submenu_selection>=menus.length)
                keys.submenu_selection=menus.length-1;
            $('.menu-item').removeClass('active');
            $(menus[keys.submenu_selection]).addClass('active');
            moveScrollPosition($('#sub-menus-wrapper'),menus[keys.submenu_selection],'vertical',false);
        }
        else if(keys.focused_part==="search_back_selection" && increment==1) { // if search back wrapper is selected
            keys.focused_part="submenu_selection";
            keys.submenu_selection=0;
            $('.search-back-button').removeClass('active');
            var menus=$('#sub-menus-wrapper').find('.menu-item');
            $(menus).removeClass('active');
            $(menus[0]).addClass('active');
        }
        else if(keys.focused_part==="setting_modal"){
            keys.setting_modal+=increment;
            var items=this.setting_options;
            if(keys.setting_modal<0)
                keys.setting_modal=items.length-1;
            if(keys.setting_modal>=items.length)
                keys.setting_modal=0;
            this.hoverSettingModal(keys.setting_modal)
        }
        else if(keys.focused_part==="parent_account_modal"){
            if(keys.parent_account_modal>=this.parent_operation_items.length-2){
                if(increment<0)
                    keys.parent_account_modal=this.parent_operation_items.length-3;
            }else{
                keys.parent_account_modal+=increment;
                if(keys.parent_account_modal<0)
                    keys.parent_account_modal=0;
            }
            this.hoverParentModal(keys.parent_account_modal);
        }
        else if(keys.focused_part==="hide_category_modal"){
            var hide_category_modal_items=$('.hide-category-modal-option');
            var hide_category_btns=$('.hide-category-btn-wrapper');
            var item_length=hide_category_modal_items.length;
            if(keys.hide_category_modal<=item_length || (keys.hide_category_modal>item_length && increment<0)){
                $(hide_category_modal_items).removeClass('active');
                $(hide_category_btns).removeClass('active');
                if(keys.hide_category_modal<=item_length)
                    keys.hide_category_modal+=increment;
                else
                    keys.hide_category_modal=item_length-1;
                if(keys.hide_category_modal<0)
                    keys.hide_category_modal=0;
                if(keys.hide_category_modal<item_length)
                {
                    $(hide_category_modal_items[keys.hide_category_modal]).addClass('active');
                    moveScrollPosition($('#hide-modal-categories-container'),hide_category_modal_items[keys.hide_category_modal],'vertical',false)
                }
                if(keys.hide_category_modal==item_length)
                    $(hide_category_btns[0]).addClass('active');
            }
        }
        else if(keys.focused_part==="parent_confirm_modal"){
            if(keys.parent_confirm_modal<=1 || (keys.parent_confirm_modal>1 && increment<0)){
                keys.parent_confirm_modal+=increment;
                if(keys.parent_confirm_modal>=1 && increment<0)
                    keys.parent_confirm_modal=0;
                if(keys.parent_confirm_modal>1)
                    keys.parent_confirm_modal=1;
                if(keys.parent_confirm_modal<0)
                    keys.parent_confirm_modal=0;

                $('#parent-confirm-password').closest('div').removeClass('active');
                $('.parent-confirm-modal-button').removeClass('active');
                if(keys.parent_confirm_modal==0)
                    $('#parent-confirm-password').closest('div').addClass('active');
                if(keys.parent_confirm_modal==1)
                    $($('.parent-confirm-modal-button')[0]).addClass('active');
            }
        }
        else if(keys.focused_part==="theme_modal"){
            var theme_options=this.theme_modal_options;
            keys.theme_modal+=increment;
            if(keys.theme_modal<0)
                keys.theme_modal=theme_options.length-1;
            if(keys.theme_modal>=theme_options.length)
                keys.theme_modal=0;
            $(theme_options).removeClass('active');
            $(theme_options[keys.theme_modal]).addClass('active');
        }
        else if(keys.focused_part==="playlist_modal"){
            keys.playlist_modal+=increment;
            if(keys.playlist_modal<0)
                keys.playlist_modal=this.playlist_modal_options.length-1;
            if(keys.playlist_modal>=this.playlist_modal_options.length)
                keys.playlist_modal=0;
            $(this.playlist_modal_options).removeClass('active');
            $(this.playlist_modal_options[keys.playlist_modal]).addClass('active');
        }
        else if(keys.focused_part==='sort_button'){
            if(increment==1 && this.movie_grid_doms.length>0){
                keys.focused_part='grid_selection';
                keys.grid_selection=0;
                var movie_grids=$('#movie-grids-container .movie-item-wrapper');
                $('#movie-grids-container .movie-item-wrapper').removeClass('active');
                $(movie_grids[0]).addClass('active');
                $('#sort-button-container').removeClass('active');
            }
        }
        else if(keys.focused_part==='sort_selection'){
            keys.sort_selection+=increment;
            if(keys.sort_selection<0)
                keys.sort_selection=this.sort_selection_doms.length-1;
            if(keys.sort_selection>=this.sort_selection_doms.length)
                keys.sort_selection=0;
            $(this.sort_selection_doms).removeClass('active');
            $(this.sort_selection_doms[keys.sort_selection]).addClass('active');
        }
        else if(keys.focused_part==='live_sort_selection'){
            var live_sort_selection_doms=this.live_sort_selection_doms;
            keys.live_sort_selection+=increment;
            if(keys.live_sort_selection<0)
                keys.live_sort_selection=live_sort_selection_doms.length-1;
            if(keys.live_sort_selection>=live_sort_selection_doms.length)
                keys.live_sort_selection=0;
            $(live_sort_selection_doms).removeClass('active');
            $(live_sort_selection_doms[keys.live_sort_selection]).addClass('active');
        }
        else if(keys.focused_part==='language_selection'){
            var language_doms=this.language_doms;
            keys.language_selection+=increment;
            if(keys.language_selection<0)
                keys.language_selection=language_doms.length-1;
            if(keys.language_selection>=language_doms.length)
                keys.language_selection=0;
            $(language_doms).removeClass('active');
            $(language_doms[keys.language_selection]).addClass('active');
            moveScrollPosition($('#select-language-body'),language_doms[keys.language_selection],'vertical',false);
        }
        else if(keys.focused_part==='epg_setting_selection') {
            keys.epg_setting_selection+=increment;
            if(keys.epg_setting_selection<0)
                keys.epg_setting_selection=0;
            if(keys.epg_setting_selection>=this.epg_setting_items.length)
                keys.epg_setting_selection=this.epg_setting_items.length-1;
            this.hoverEpgSettingItem(keys.epg_setting_selection);
        }
    },
    handleMenuLeftRight:function(increment) {
        var keys=this.keys;
        switch (keys.focused_part) {
            case "slider_selection":
                this.MoveKeyOnMovies(increment);
                break;
            case "grid_selection":
                this.handleMovieGridKeyEvent(increment)
                break;
            case "menu_selection":
                if(increment>0)
                    this.KeyToMovies();
                break;
            case "search_back_selection":
                var max_value=1;
                if(this.movie_grids_extended==1){   // if movie or series grid items extended, will be able to select search button
                    max_value=1;
                }
                keys.search_back_selection+=increment;
                if(keys.search_back_selection>max_value)
                {
                    keys.search_back_selection=max_value;
                    $('.search-back-button').removeClass('active');
                    if(this.movie_grids_extended==1) {  // if in right side, is showing movie grids
                        keys.focused_part = "grid_selection";
                        keys.grid_selection = 0;
                        var movie_grids = $('#movie-grids-container').find('.movie-item-wrapper');
                        $(movie_grids[0]).addClass('active');
                    }
                    else{
                        keys.focused_part="slider_selection";
                        this.KeyToMovies();
                    }
                    return;
                }
                if(keys.search_back_selection<0)
                    keys.search_back_selection=0;
                $('.search-back-button').removeClass('active');
                $($('.search-back-button')[keys.search_back_selection]).addClass('active');
                break;
            case "submenu_selection":
                if(increment>0){
                    $(this.submenu_items).removeClass('active');
                    if(this.movie_grids_extended==1) {  // if in right side, is showing movie grids
                        keys.focused_part = "grid_selection";
                        keys.grid_selection = 0;
                        var movie_grids = $('#movie-grids-container').find('.movie-item-wrapper');
                        $(movie_grids[0]).addClass('active');

                    }
                    else{
                        keys.focused_part="slider_selection";
                        this.KeyToMovies();
                    }
                }
                break;
            case "refresh_modal":
                keys.refresh_modal+=increment;
                var buttons=$('#refresh-modal').find('button');
                if(keys.refresh_modal<0)
                    keys.refresh_modal=1;
                if(keys.refresh_modal>1)
                    keys.refresh_modal=0;
                $(buttons).removeClass('active');
                $(buttons[keys.refresh_modal]).addClass('active');
                break;
            case "turn_off_modal":
                keys.turn_off_modal+=increment;
                var buttons=$('#turn-off-modal').find('button');
                if(keys.turn_off_modal<0)
                    keys.turn_off_modal=1;
                if(keys.turn_off_modal>1)
                    keys.turn_off_modal=0;
                $(buttons).removeClass('active');
                $(buttons[keys.turn_off_modal]).addClass('active');
                break;
            case "parent_account_modal":
                if(keys.parent_account_modal>=this.parent_operation_items.length-2){
                    if(increment>0)
                        keys.parent_account_modal=this.parent_operation_items.length-1;
                    else
                        keys.parent_account_modal=this.parent_operation_items.length-2;
                    this.hoverParentModal(keys.parent_account_modal);
                }
                break;
            case "hide_category_modal":
                var hide_category_modal_items=$('.hide-category-modal-option');
                var hide_category_btns=$('.hide-category-btn-wrapper');
                var item_length=hide_category_modal_items.length;
                if(keys.hide_category_modal<item_length){
                    if(increment<0)
                        keys.hide_category_modal=item_length;
                    else
                        keys.hide_category_modal=item_length+hide_category_btns.length-1;
                }
                else{
                    keys.hide_category_modal+=increment;
                    if(keys.hide_category_modal<item_length)
                        keys.hide_category_modal=item_length;
                    if(keys.hide_category_modal>=item_length+hide_category_btns.length)
                        keys.hide_category_modal=item_length+hide_category_btns.length-1;
                }
                $(hide_category_modal_items).removeClass('active');
                $(hide_category_btns).removeClass('active');
                $(hide_category_btns[keys.hide_category_modal-item_length]).addClass('active');
                break;
            case "parent_confirm_modal":
                if(keys.parent_confirm_modal>=1){
                    keys.parent_confirm_modal+=increment;
                    if(keys.parent_confirm_modal>2)
                        keys.parent_confirm_modal=2;
                    if(keys.parent_confirm_modal<1)
                        keys.parent_confirm_modal=1;
                    $('#parent-confirm-password').closest('div').removeClass('active');
                    $('.parent-confirm-modal-button').removeClass('active');
                    $($('.parent-confirm-modal-button')[keys.parent_confirm_modal-1]).addClass('active');
                }
                break;
            case "sort_button":
                if(increment==-1){
                    keys.focused_part="search_back_selection";
                    keys.search_back_selection=1;
                    $('#search-button-wrapper').addClass('active');
                    $('#sort-button-container').removeClass('active');
                }
                break;
            case "lock_account_selection":
                keys.lock_account_selection+=increment;
                if(keys.lock_account_selection<0)
                    keys.lock_account_selection=0;
                if(keys.lock_account_selection>1)
                    keys.lock_account_selection=1;
                this.hoverLockAccountBtn(keys.lock_account_selection);
                break;
            case "featured_setting_selection":
                keys.featured_setting_selection+=increment;
                if(keys.featured_setting_selection<0)
                    keys.featured_setting_selection=0;
                if(keys.featured_setting_selection>=this.featured_setting_doms.length)
                    keys.featured_setting_selection=this.featured_setting_doms.length-1;
                this.hoverFeaturedSettingBtn(keys.featured_setting_selection);
                break;
            case "clear_cache_selection":
                keys.clear_cache_selection=increment>0 ? 1 : 0;
                this.hoverCacheConfirmModal(keys.clear_cache_selection);
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "menu_selection":
                var menus=$('#menu-wrapper').find('.menu-item');
                var current_menu=menus[keys.menu_selection];
                $(current_menu).trigger('click');
                break;
            case "search_back_selection":
                if(keys.search_back_selection==0)
                    this.goBack();
                else
                    $('#search-button-wrapper').trigger('click');
                break;
            case "submenu_selection":
                var menus=$('#sub-menus-wrapper').find('.menu-item');
                var current_submenu=menus[keys.submenu_selection];
                $(current_submenu).trigger('click');
                break;
            case "slider_selection":
                this.showPreviewVideo(this.slider_items[keys.slider_selection][keys.slider_item_index]);
                break;
            case "grid_selection":
                if(current_movie_type==="movies")
                    this.showVodSummary();
                if(current_movie_type==="series")
                    this.showSeriesSummary();
                break;
            case "refresh_modal":
                $(this.refresh_options[this.keys.refresh_modal]).trigger('click');
                break;
            case "turn_off_modal":
                $(this.turn_off_options[keys.turn_off_modal]).trigger('click');
                break;
            case "setting_modal":
                var items=$('#settings-modal').find('.modal-operation-menu-type-3');
                $(items[this.keys.setting_modal]).trigger('click');
                break;
            case "parent_account_modal":
                if(keys.parent_account_modal<this.parent_operation_items.length-2){
                    focusOnInputElement($(this.parent_operation_items[keys.parent_account_modal]).find('input'));
                }
                else
                    $(this.parent_operation_items[keys.parent_account_modal]).trigger('click');
                break;
            case "hide_category_modal":
                var hide_category_modal_items=$('.hide-category-modal-option');
                var hide_category_btns=$('.hide-category-btn-wrapper');
                var item_length=hide_category_modal_items.length;
                if(keys.hide_category_modal<item_length){
                    var current_item=hide_category_modal_items[keys.hide_category_modal];
                    var current_value=$($(current_item).find('input')[0]).prop('checked');
                    $($(current_item).find('input')[0]).prop('checked',!current_value);
                }
                else{
                    $($(hide_category_btns[keys.hide_category_modal-item_length]).find('button')[0]).trigger('click');
                }
                break;
            case "parent_confirm_modal":
                if(keys.parent_confirm_modal==0){
                    $('#parent-confirm-password').focus();
                }
                else{
                    $($('.parent-confirm-modal-button')[keys.parent_confirm_modal-1]).trigger('click');
                }
                break;
            case "theme_modal":
                $(this.theme_modal_options[keys.theme_modal]).trigger('click');
                break;
            case "playlist_modal":
                $(this.playlist_modal_options[this.keys.playlist_modal]).trigger('click');
                break;
            case "sort_button":
                $('#sort-button').trigger('click');
                break;
            case "sort_selection":
                $(this.sort_selection_doms[keys.sort_selection]).trigger('click');
                break;
            case "live_sort_selection":
                $(this.live_sort_selection_doms[keys.live_sort_selection]).trigger('click');
                break;
            case "language_selection":
                $(this.language_doms[keys.language_selection]).trigger('click');
                break;
            case "lock_account_selection":
                this.saveLockState();
                break;
            case "featured_setting_selection":
                this.saveFeaturedSetting();
                break;
            case "clear_cache_selection":
                $(this.clear_cache_btns[keys.clear_cache_selection]).trigger('click');
                break;
            case "epg_setting_selection":
                $(this.epg_setting_items[keys.epg_setting_selection]).trigger('click');
                break;
        }
    },
    HandleKey:function(e){
        if(!this.is_drawing) {
            switch (e.keyCode) {
                case tvKey.RIGHT:
                    this.handleMenuLeftRight(1);
                    break;
                case tvKey.LEFT:
                    this.handleMenuLeftRight(-1);
                    break;
                case tvKey.DOWN:
                    this.handleMenusUpDown(1)
                    break;
                case tvKey.UP:
                    this.handleMenusUpDown(-1)
                    break;
                case tvKey.ENTER:
                    this.handleMenuClick();
                    break;
                case tvKey.RED:
                    this.removeMovieFromFeaturedList();
                    break;
                case tvKey.YELLOW:
                    this.addVodOrSeriesToFavourite();
                    break;
                case tvKey.BLUE:
                    this.moveToOtherCategory();
                    break;
                case tvKey.RETURN:
                    this.goBack();
            }
        }
    }
}
