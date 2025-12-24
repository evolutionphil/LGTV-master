"use strict";
var search_page={
    keys:{
        top_menu_selection:0,
        hor_keys:[0,0,0],
        ver_selection:0,
        movie_selection:[],
        focused_part:''
    },
    prev_dom:null,
    is_loading:false,
    filtered_movies:[],
    render_counts:[0,0,0],
    prev_keyword:'',
    search_timeout:null,
    prev_route:'',
    top_menu_doms:$('.search-page-top-menu'),
    movie_doms:[],
    render_count_increment:50,
    parent_elements:[$('#filtered_channels_container')[0], $('#filtered_movies_container')[0], $('#filtered_series_container')[0]],
    init:function(prev_route){
        this.prev_route=prev_route;
        $('#filtered_movies_container').html('');
        $('#filtered_channels_container').html('');
        $('#filtered_series_container').html('');
        this.filtered_movies=[];
        this.keys.hor_keys=[0,0,0];
        this.prev_keyword='';
        $('#search-page-input').val('')
        $('#search-page').show();
        current_route='search-page';
        this.hoverTopMenu(1);
        this.handleMenuClick();
    },
    goBack:function(){
        clearTimeout(this.search_timeout);
        $('#search-page-input').blur();
        $('#search-page').hide();
        switch (this.prev_route) {
            case "home-page":
                home_page.reEnter();
                break;
        }
    },
    keywordChange:function(){
        clearTimeout(this.search_timeout);
        var that=this;
        this.search_timeout=setTimeout(function () {
            var prev_keyword=that.prev_keyword;
            var keyword=$('#search-page-input').val().toLowerCase();
            if(prev_keyword==keyword || !keyword)
                return;
            showLoader(true);
            that.is_loading=true;
            var vod_categories=VodModel.getCategories(false,false);
            var series_categories=SeriesModel.getCategories(false,false);
            var live_categories=LiveModel.getCategories(false,false);

            that.filtered_movies=[];
            that.filtered_movies.push(that.getFilteredMovies(live_categories,keyword));
            that.filtered_movies.push(that.getFilteredMovies(vod_categories,keyword));
            that.filtered_movies.push(that.getFilteredMovies(series_categories,keyword));

            that.render_counts=[0,0,0];
            that.keys.hor_keys=[0,0,0];
            that.movie_doms=[[],[],[]];
            $(that.parent_elements[0]).html('');
            $(that.parent_elements[1]).html('');
            $(that.parent_elements[2]).html('');
            for(var i=0;i<3;i++){
                var movies=that.filtered_movies[i];
                if(movies.length>0)
                    that.renderFilteredMovies(i,false);
                else {
                    var nothing_found_text=current_words['nothing_found'] ? current_words['nothing_found'] : "Nothing Found"
                    $(that.parent_elements[i]).html('<div class="empty-movie-text">'+nothing_found_text+'</div>');
                }
            }
            that.prev_keyword=keyword;
            var time_out=2000;
            var total_length=that.filtered_movies[0].length+that.filtered_movies[1].length+that.filtered_movies[2].length;
            if(total_length<50)
                time_out=500;
            setTimeout(function () {
                showLoader(false);
                that.is_loading=false;
            },time_out)
        },400)
    },
    getFilteredMovies:function(categories, keyword){
        var result=[];
        var hideBlocked = localStorage.getItem('hide_blocked_content') === 'true';
        
        categories.map(function (item) {
            if(!checkForAdult(item,'category',[])){
                var movies=item.movies.filter(function (movie) {
                    return movie.name.toLowerCase().includes(keyword)
                })
                result=result.concat(movies);
            }
        })
        
        // Filter out blocked content if hide_blocked_content is enabled
        if(hideBlocked && result.length > 0) {
            // Determine content type based on the first item's properties
            var contentType = 'channel'; // default
            if(result[0].hasOwnProperty('container_extension')) {
                contentType = 'movie';
            } else if(result[0].hasOwnProperty('cover')) {
                contentType = 'series';
            }
            
            result = result.filter(function(movie) {
                return !isContentBlocked(movie.name, contentType);
            });
        }
        
        return result;
    },
    renderFilteredMovies:function(index, hide_loader){
        var parent_element=this.parent_elements[index];
        var render_count=this.render_counts[index];
        if(render_count>=this.filtered_movies[index].length)
            return;
        var render_count_increment=this.render_count_increment;
        if(hide_loader){
            showLoader(true);
            this.is_loading=true;
        }
        var that=this;
        var html='';
        var channel_class=index==0 ? ' channel' : '';
        var img_key='stream_icon';
        if(index==2)
            img_key='cover';
        var default_image='';
        if(index==0)
            default_image='images/default_icon.jpeg';
        else if(index==1)
            default_image='images/404.png';
        else if(index==2)
            default_image='images/series.png';

        var movies=this.filtered_movies[index].slice(render_count, render_count+render_count_increment);
        var time_out=1500;
        if(movies.length<10)
            time_out=0;
        movies.map(function (item, index1) {
            html+=
                '<div class="filtered-movie-container'+channel_class+'">\
                    <div class="filtered-movie-wrapper"\
                        onmouseenter="search_page.hoverMovie('+(render_count+index1)+','+index+')"\
                        onclick="search_page.handleMenuClick()" \
                    >\
                        <div class="filtered-movie-img-wrapper">\
                            <img src="'+item[img_key]+'" onerror="this.src=\''+default_image+'\'">\
                        </div>\
                        <div class="filtered-movie-title-wrapper">\
                            <div class="filtered-movie-title">'+item.name+'</div> \
                        </div> \
                    </div>\
                </div>'
        })
        this.render_counts[index]+=render_count_increment;
        $(parent_element).append(html);
        this.movie_doms[index]=$(parent_element).find('.filtered-movie-wrapper');
        if(hide_loader){
            setTimeout(function () {
                showLoader(false);
                that.is_loading=false;
            },time_out);
        }
    },
    hoverTopMenu:function(index){
        var keys=this.keys;
        keys.focused_part='top_menu_selection';
        keys.top_menu_selection=index;
        $(this.prev_dom).removeClass('active');
        $(this.top_menu_doms[index]).addClass('active');
        this.prev_dom=this.top_menu_doms[index];
    },
    hoverMovie:function(hor_index, ver_index){
        var keys=this.keys;
        keys.hor_keys[ver_index]=hor_index;
        keys.ver_selection=ver_index;
        keys.focused_part='movie_selection';
        var parent_element=this.parent_elements[ver_index];
        $(this.prev_dom).removeClass('active');
        $(this.movie_doms[ver_index][hor_index]).addClass('active');
        this.prev_dom=this.movie_doms[ver_index][hor_index];
        moveScrollPosition(parent_element,this.prev_dom,'horizontal',false);
        moveScrollPosition($('#search-page-contents-wrapper'),parent_element,'vertical',false);
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(increment<0)
                    keys.top_menu_selection=0;
                else
                    keys.top_menu_selection=1;
                this.hoverTopMenu(keys.top_menu_selection);
                break;
            case "movie_selection":
                var new_selection=keys.hor_keys[keys.ver_selection]+increment;
                if(new_selection<0)
                    new_selection=0;
                if(new_selection>=this.movie_doms[keys.ver_selection].length)
                    new_selection=this.movie_doms[keys.ver_selection].length-1;
                this.hoverMovie(new_selection,keys.ver_selection);
                if(increment>0 && new_selection>=this.movie_doms[keys.ver_selection].length-5)
                    this.renderFilteredMovies(keys.ver_selection, true);
                break;
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(increment>0){
                    for(var i=0;i<this.filtered_movies.length;i++) {
                        if(this.filtered_movies[i].length>0){
                            keys.ver_selection=i;
                            this.hoverMovie(keys.hor_keys[i],i);
                            break;
                        }
                    }
                }
                break;
            case "movie_selection":
                var ver_selection=-1;
                if(increment>0) {
                    if(keys.ver_selection>=2)
                        return;
                    for(var i=keys.ver_selection+1;i<3;i++) {
                        if(this.filtered_movies[i].length>0) {
                            ver_selection=i;
                            break;
                        }
                    }
                }else {
                    for(var i=keys.ver_selection-1;i>=0;i--) {
                        if(this.filtered_movies[i].length>0) {
                            ver_selection=i;
                            break;
                        }
                    }
                    if(keys.ver_selection<=0 || ver_selection==-1){
                        this.hoverTopMenu(1);
                        return
                    }
                }
                if(ver_selection!=-1)
                    this.hoverMovie(keys.hor_keys[ver_selection],ver_selection);
                break;
        }
    },
    handleMenuClick:function(){
        var keys=this.keys;
        switch (keys.focused_part) {
            case "top_menu_selection":
                if(keys.top_menu_selection==0)
                    this.goBack();
                else{
                    $('#search-page-input').focus()
                    setSelectionRange($('#search-page-input'));
                }
                break;
            case 'movie_selection':
                var movie=this.filtered_movies[keys.ver_selection][keys.hor_keys[keys.ver_selection]];
                $('#search-page').hide();
                switch (keys.ver_selection) {
                    case 0:
                        var categories=LiveModel.categories;
                        for(var i=0;i<categories.length;i++){
                            if(categories[i].category_id==movie.category_id){
                                current_category=categories[i];
                                channel_page.init(movie.stream_id,true);
                                break;
                            }
                        }
                        break;
                    case 1:
                        current_movie=this.filtered_movies[1][keys.hor_keys[1]];
                        vod_summary_page.init('search-page');
                        break;
                    case 2:
                        current_series=this.filtered_movies[2][keys.hor_keys[2]];
                        series_summary_page.init('search-page');
                        break;
                }
                break;
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