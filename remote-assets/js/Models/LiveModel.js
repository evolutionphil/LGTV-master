"use strict";
var LiveModel={
    movies:[],
    category_name:'live',
    favourite_category_index:'top-1',
    recent_category_index:'bottom-1',
    favourite_insert_position:'before', // or after
    recent_insert_position:'before',
    favourite_movie_count:200,
    recent_movie_count:15,
    movie_key:"stream_id",
    categories:[],
    programmes:[],
    movie_saved:false,
    programme_saved:false,
    favourite_ids:[],
    channel_orders: {},

    init: function (category_name) {
        this.category_name=category_name;
        this.programmes = [];
    },
    saveProgrammes: function (programmes,stream_id) {
        this.programmes = programmes;
        this.programme_saved=true;
        if(this.movie_saved)
            this.insertProgrammesToChannels(stream_id);
    },
    setCategories:function(categories){
        var hidden_categories=localStorage.getItem(storage_id+settings.playlist_url+this.category_name+"_hiddens");
        hidden_categories=hidden_categories==null ? [] : JSON.parse(hidden_categories);
        categories.map(function(category){
            category.is_hide=false;
            if(hidden_categories.includes(category.category_id))
                category.is_hide=true;
        })
        this.categories=categories;
    },
    saveHiddenCategories:function(category_ids){
        var categories=this.categories;
        categories.map(function(category){
            category.is_hide=false;
            if(category_ids.includes(category.category_id)) {
                category.is_hide = true;
            }
        })
        localStorage.setItem(storage_id+settings.playlist_url+this.category_name+"_hiddens",JSON.stringify(category_ids))
    },
    showAllCategories:function(){
        var categories=this.categories;
        categories.map(function(category){
            category.is_hide=false;
        })
        localStorage.setItem(storage_id+settings.playlist_url+this.category_name+"_hiddens",JSON.stringify([]))
    },
    getCategories:function(include_hide_category,include_favourite_recent){
        var categories=this.categories.filter(function(category){
            if(include_favourite_recent){
                if(!include_hide_category)
                    return !category.is_hide;
                else
                    return true;
            }
            else{
                if(!include_hide_category)
                    return !category.is_hide && (category.category_id!=="favourite" && category.category_id!=="recent");
                else
                    return category.category_id!=="favourite" && category.category_id!=="recent";
            }

        })
        return categories;
    },
    setMovies:function(movies){
        if(typeof movies=='undefined' || movies==='' || movies===null)
            movies=[];
        this.movies=movies;
        this.movie_saved=true;
    },
    insertMoviesToCategories:function(){
        var channel_orders=localStorage.getItem(storage_id+settings.playlist_url+'_channel_orders');
        if(!channel_orders)
            channel_orders={};
        else
            channel_orders=JSON.parse(channel_orders);
        this.channel_orders=channel_orders;

        var movies=this.movies;
        var categories=this.categories;
        var recent_category={
            category_id:'recent',
            category_name:'Recently Viewed',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var favourite_category={
            category_id:'favourite',
            category_name:'Favourites',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        var undefined_category={
            category_id:'undefined',
            category_name:'Uncategorized',
            parent_id:0,
            movies:[],
            is_hide:false
        }
        categories.push(undefined_category);
         var temps1=this.getRecentOrFavouriteCategoryPosition('recent');
        var recent_category_position=temps1[0],recent_category_index=temps1[1];
        var temps2=this.getRecentOrFavouriteCategoryPosition('favourite');
        var favourite_category_position=temps2[0], favourite_category_index=temps2[1];

        var movie_id_key=this.movie_key;
        var recent_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist_url+"_"+this.category_name+"_recent"));
        var favourite_movie_ids=JSON.parse(localStorage.getItem(storage_id+settings.playlist_url+"_"+this.category_name+"_favourite"));
        recent_movie_ids=recent_movie_ids==null ? [] : recent_movie_ids;
        favourite_movie_ids=favourite_movie_ids==null ? [] : favourite_movie_ids;

        var recent_movies=[], favourite_movies=[];
        var that=this;
        var movies_map={};
        movies.map(function(movie){
            movie.is_recent=false;
            movie.is_favourite=false;
            movie.programmes=[];

            if(typeof movie.category_id=='undefined' || movie.category_id=='null' || movie.category_id==null){
                movie.category_id='undefined';
            }

            if(typeof movies_map[movie.category_id]=="undefined")
                movies_map[movie.category_id]=[];
            movies_map[movie.category_id].push(movie);

            if(recent_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.recent_insert_position==="before")
                    recent_movies.unshift(movie);
                else
                    recent_movies.push(movie);
                movie.is_recent=true;
            }
            if(favourite_movie_ids.includes(movie[movie_id_key]))// if movie id is in recently viewed movie ids
            {
                if(that.favourite_insert_position==="before")
                    favourite_movies.unshift(movie);
                else
                    favourite_movies.push(movie);
            }
        });
        this.favourite_ids=favourite_movie_ids;

        for(var  i=0;i<categories.length;i++){ // except favourite, and recent movies
            categories[i].movies=typeof movies_map[categories[i].category_id]!="undefined" ?
                movies_map[categories[i].category_id] : [];
        }

        recent_category.movies=recent_movies;
        var movies1=favourite_movies;
        if(channel_orders['favourite']){  // rearrange started.
            var orders=channel_orders['favourite'];
            console.log(orders);
            for(var j=0;j<orders.length;j++){
                for(var k=0;k<movies1.length;k++){
                    // console.log(orders[j],movies1[k],orders[j].id==movies1[k].stream_id && orders[j].name==movies[k].name)
                    if(orders[j].id==movies1[k].stream_id && orders[j].name==movies1[k].name){
                        movies1=makeRearrangeArray(movies1,k,orders[j].position);
                        console.log(j+" step finished with k",orders[j], movies1[k]);
                        break;
                    }
                }
            }
        }
        // console.log(movies1);
        favourite_category.movies=movies1;
        if(recent_category_position==="bottom"){
            if(favourite_category_position==="bottom"){  // all are bottom added
                if(favourite_category_index>recent_category_index){  // first favourite, secend recent
                    categories.push(favourite_category);
                    categories.push(recent_category);
                }
                else{
                    categories.push(recent_category);
                    categories.push(favourite_category);
                }
            }
            else{
                categories.unshift(favourite_category);
                categories.push(recent_category);
            }
        }
        else{
            if(favourite_category_position==="top"){  // all are bottom added
                if(favourite_category_index>recent_category_index){  // first favourite, secend recent
                    categories.push(favourite_category);
                    categories.push(recent_category);
                }
                else{
                    categories.push(recent_category);
                    categories.push(favourite_category);
                }
            }
            else{
                categories.unshift(recent_category);
                categories.push(favourite_category);
            }
        }

        for(var i=0;i<categories.length;i++){
            if(categories[i].category_id==='undefined'){
                if(categories[i].movies.length==0){
                    categories.splice(i,1);
                }
                break;
            }
        }
        this.categories=categories;
        this.movie_saved=true;
        if(this.programme_saved)
            this.insertProgrammesToChannels();
    },
    getRecentOrFavouriteCategoryPosition:function(kind){
        var category_index_str_key=this[kind+"_category_index"];
        var temps=category_index_str_key.split("-");
        var category_position=temps[0],category_index=temps[1];
        category_index=parseInt(category_index);
        if(category_position==="bottom")  // if select category from bottom
            category_index=this.categories.length-category_index
        else  // if select category from top position
            category_index--;
        return [category_position, category_index];
    },
    getRecentOrFavouriteCategory:function(kind){
        var categories=this.categories;
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        return this.categories[category_index];
    },
    getRecentOrFavouriteMovies:function(kind){
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        return this.categories[category_index].movies;
    },
    setRecentOrFavouriteMovies:function(movies, kind){
        var category_index=this.getRecentOrFavouriteCategoryPosition(kind)[1];
        this.categories[category_index].movies=movies;
    },
    addRecentOrFavouriteMovie:function(movie, kind) {
        var movies=this.getRecentOrFavouriteMovies(kind);
        var exist=false;
        var movie_id_key=this.movie_key;
        var is_updated=false; // if added, it will be true
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie[movie_id_key]){
                exist=true;
                break;
            }
        }
        if(!exist){
            var insert_position=this[kind+"_insert_position"];
            if(insert_position==="before")
                movies.unshift(movie);
            else
                movies.push(movie);
            var max_count=this[kind+"_movie_count"];
            var max_count_exceed=movies.length>max_count, latest_id=movies[movies.length-1][this.movie_key];
            movies=movies.splice(0,max_count);
            var movie_ids=movies.map(function(item){
                return item[movie_id_key];
            })
            this.setRecentOrFavouriteMovies(movies,kind)
            localStorage.setItem(storage_id+settings.playlist_url+"_"+this.category_name+"_"+kind, JSON.stringify(movie_ids));
            is_updated=true;
        }
        if (is_updated && kind === "favourite") {  // if added to favourite recent live tv, then it will be added to slider
            this.favourite_ids=movie_ids;
            channel_page.addFavouriteIconToChannelMenu(channel_page.hover_channel_id,'add');
            var htmlContent = home_page.makeSliderMovieItemElement(movie, 'live',0,0);
            $('#favourite_tv_wrapper').prepend(htmlContent);
            if(max_count_exceed){
                $($('#favourite_tv_wrapper .movie-item-wrapper[data-stream_id="'+latest_id+'"]').closest('.movie-item-container')).remove();
            }
            var movie_items=$('#favourite_tv_wrapper').find('.movie-item-wrapper');
            for(var i=0;i<movie_items.length;i++){
                $(movie_items[i]).data('slider_item_index',i)
            }
            home_page.slider_items[0]=$('#favourite_tv_wrapper').find('.movie-item-wrapper');
        }
        return is_updated;
    },
    removeRecentOrFavouriteMovie:function(movie_id, kind) {
        var movies=this.getRecentOrFavouriteMovies(kind);
        var movie_id_key=this.movie_key;
        var is_removed=false;
        for(var i=0;i<movies.length;i++){
            if(movies[i][movie_id_key]==movie_id){
                movies.splice(i,1);
                is_removed=true;
                break;
            }
        }
        this.setRecentOrFavouriteMovies(movies, kind);
        var movie_ids=movies.map(function(item){
            return item[movie_id_key];
        })
        this.setRecentOrFavouriteMovies(movies,kind);
        this.favourite_ids=movie_ids;
        localStorage.setItem(storage_id+settings.playlist_url+"_"+this.category_name+"_"+kind, JSON.stringify(movie_ids));
        channel_page.addFavouriteIconToChannelMenu(channel_page.hover_channel_id, 'remove');
        if (is_removed && kind === "favourite") {
            var domElement = getDomElementFromData($('#favourite_tv_wrapper .movie-item-wrapper'), 'stream_id', channel_page.hover_channel_id);
            var container=$(domElement).closest('.movie-item-container');
            $(container).remove();
            var movie_items=$('#favourite_tv_wrapper').find('.movie-item-wrapper');
            for(var i=0;i<movie_items.length;i++){
                $(movie_items[i]).data('slider_item_index',i)
            }
            var keys=home_page.keys;
            home_page.slider_items[0]=$('#favourite_tv_wrapper').find('.movie-item-wrapper');
            if(home_page.slider_items[0].length>0){
                if(keys.slider_item_index>=home_page.slider_items[0].length){
                   keys.slider_item_index=home_page.slider_items[0].length-1;
                    $(home_page.slider_items[0][keys.slider_item_index]).addClass('active');
                }
            }else{
                if(home_page.slider_items[1].length>0){
                    keys.slider_selection=1;
                    keys.slider_item_index=0;
                    $(home_page.slider_items[1][0]).addClass('active');
                }else{
                    if(keys.focused_part==="slider_selection"){
                        if(home_page.submenu_opened){
                            keys.focused_part="submenu_selection";
                            $(this.submenu_items[0]).addClass('active');
                        }else{
                            keys.focused_part="menu_selection";
                            $(home_page.menu_items[0]).addClass('active')
                        }
                    }
                }
            }
        }
    },
    checkForAdult:function(movie){
        var is_adult=false;
        var categories=this.getCategories(false,false);
        for(var i=0;i<categories.length;i++) {
            if (movie.category_id == categories[i].category_id) {
                var category = categories[i];
                var category_name=category.category_name.toLowerCase();
                if(category_name.includes('xxx') ||  category_name.includes('adult') || category_name.includes('porn') || category.parent_id==1)
                    is_adult=true;
                break;
            }
        }
        return is_adult;
    },
    insertProgrammesToChannels: function (stream_id) {
        var channel_programmes = this.programmes;
        var movies = this.getAllMovies();
        for (var i = 0; i < movies.length; i++) {
            try{
                if (movies[i][stream_id] != null && movies[i][stream_id] !== "") {
                    var key=movies[i][stream_id].toString().trim().toLowerCase();
                    var programmes = typeof channel_programmes[key]!="undefined" ? channel_programmes[key] : [];
                    programmes.sort(function (a, b) {
                        return a.start.localeCompare(b.start)
                    });
                    movies[i].programmes = programmes;
                    if(programmes.length>0){
                        console.log(movies[i]);
                    }
                } else {
                    movies[i].programmes = [];
                }
            }catch(e){
            }
        }
        this.movies = movies;
    },
    getAllMovies:function(){
        var movies=this.movies;
        return movies;
    },
    getMovieFromId:function(id){
        var movies=this.movies;
        var result=null;
        for(var i=0;i<movies.length;i++){
            if(movies[i].stream_id==id)
            {
                result=movies[i];
                break;
            }
        }
        return result;
    },
    getNextProgrammes:function(programmes){
        var current_program_exist=false;
        var next_programmes=[];
        var current_time=moment(new Date()).unix();
        var k=0;
        for(var i=0;i<programmes.length;i++){
            var item=programmes[i];
            var stop=moment(item.stop).unix();
            if(stop>=current_time){
                k++;
                var start=moment(item.start).unix();
                if(start<=current_time)
                    current_program_exist=true;
                next_programmes.push(programmes[i]);
            }
            if(k>=4)
                break;
        }
        return {
            current_program_exist:current_program_exist,
            programmes:next_programmes
        }
    }
}
