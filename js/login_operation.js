"use strict";
var login_page={
    keys:{
        focused_part:"playlist_selection",
        playlist_selection:0,
        turn_off_modal:0,
        network_issue_btn:0,
        playlist_modal_selection:0,
        terms_button_selection:0
    },
    network_btn_doms:$('.network-issue-btn'),
    showLoadImage:function(){
        $('#login-container .left-part-content').hide();
        $('.loader-image-container').show();
    },
    hideLoadImage:function() {
        $('.loader-image-container').hide();
        $('#login-container .left-part-content').show();
    },
    goToHomePage:function(){
        // this.hideLoadImage();
        $('#login-container').hide();
        home_page.init();
    },
    startApp:function(data){
        var today=moment().format('Y-MM-DD');
        var that=this;
        // that.hideLoadImage();
        saveData('adverts', data.adverts);
        saveData('playlist_urls',data.urls);
        saveData('youtube_playlists',data.youtube_playlists);
        saveData('youtube_api_key',data.youtube_api_key);
        console.log(data);


        var  themes=data.themes;
        saveData('themes',themes);
        var htmlContents='';
        themes.map(function(theme, index){
            htmlContents+=
                '<div class="modal-operation-menu-type-3 theme-modal-option"\
                    onclick="home_page.pickTheme('+index+')"\
                                                    onmouseenter="home_page.hoverThemeModal('+index+')"\
                                                >'+
                theme.name+
                '</div>'
        })
        $('#theme-modal-body').html(htmlContents);
        var sliderContents='';
        if(adverts.length>0){
            adverts.map(function(advert){
                sliderContents+=
                    '<div>\
                        <div style="white-space: nowrap">\
                            <div style="width: 58.3%;vertical-align: top;display: inline-block">\
                                <div class="advertise-information-container">\
                                    <h3 class="home-advert-title">'+advert.title+'</h3>\
                                            <p class="home-advert-description">'+
                    advert.description+
                    '</p>\
                </div>\
            </div>\
            <div class="home-slick-image-container">'+
                    '   <img src="'+advert.url+'" onerror="this.onerror=null; this.src=\'images/advertise.png\'">\
                                        </div>\
                                    </div>\
                                </div>';
            })
        }
        $('#home-page-slider-container').html(sliderContents);


        var bg_img_index=0;
        var bg_img_index_temp=localStorage.getItem(storage_id+'bg_img_index');
        if(bg_img_index_temp!=null)
            bg_img_index=parseInt(bg_img_index_temp);
        saveData('settings.bg_img_index', bg_img_index);
        saveData('expire_date',data.expire_date);
        saveData('is_trial', data.is_trial);
        saveData('languages',data.languages);
        saveData('lock',data.lock);
        if(data.pin_code)
            parent_account_password=data.pin_code;
        changeBackgroundImage();

        if(!data.mac_registered) {
            $('#login-play-list-information').html(
                'Your mac address is not registered yet.<br>\
                -You can activate your mac address and try 7 days free trial in <a class="login-page-link">https://flixapp.net/activation</a>\
                <br>-You can try with our demo playlist url without registering your playlist url.\
                &nbsp;Demo url will be valid for 7 days since you logged in first time.'
            ).show();
            that.login();
        }
        else{
            if(data.expire_date<today){
                this.hideLoadImage();
                saveData('mac_valid',false);
                // Ensure network issue dialog is hidden on expire screen
                $('#network-issue-container').hide();
                if(data.is_trial==1){
                    $('#login-play-list-information').html(
                        'Your trial has expired, please activate your device from <a class="login-page-link">https://flixapp.net/activation</a> <br><br> <img style="min-width: 400px; max-width: 600px;" src="https://flixapp.net/images/activation-qr-code.svg"> <p> <p>Scan here to visit the activation page</p>'
                    ).show();
                }
                else{
                    $('#login-play-list-information').html(
                        'Your account valid duration has expired, please try extend expire date from <a class="login-page-link">https://flixapp.net/activation</a> <br><br> <img style="min-width: 400px; max-width: 600px;" src="https://flixapp.net/images/activation-qr-code.svg"> <p> <p>Scan here to visit the activation page</p>'
                    ).show();
                }
                // Do NOT call that.login() when expired to prevent network issues
            }
            else{
                if(data.is_trial==1){  // will show tiral end message
                    $('#login-play-list-information').html(
                        'Your trial period will expire on '+data.expire_date+', please activate your device from <a class="login-page-link">https://flixapp.net/activation</a> <br> <img style="min-width: 400px; max-width: 600px;" src="https://flixapp.net/images/activation-qr-code.svg"> <br> <strong>Scan here to visit the activation page</strong>'
                    ).show();
                    that.login();
                }
                else{  // if expire date less than 7 days later, will show expire date end soon message
                    var date1=moment().add(7,'days').format('Y-MM-DD');
                    if(data.expire_date<date1)
                        $('#login-play-list-information').html(
                            'Your account valid date will be ended on '+data.expire_date+', please try extend expire date from <a class="login-page-link">https://flixapp.net/activation</a> <br> <img style="min-width: 400px; max-width: 600px;" src="https://flixapp.net/images/activation-qr-code.svg"> <br> <strong>Scan here to visit the activation page</strong>'
                        ).show();
                    that.login();
                }
            }
        }
    },
    fetchPlaylistInformation:function(){
        var that=this;
        $('.mac-address').text(mac_address);
        var keys=this.keys;
        var version=platform==='samsung' ? samsung_version : lg_version;
        var data={
            mac_address:mac_address,
            app_type:platform,
            version:version
        }
        var encrypted_data=encryptRequest(data);
        $.ajax({
            method: 'post',
            url: panel_url+"/device_info",
            data:{
                data:encrypted_data,
            },
            success: function (data1) {
                var data=decryptResponse(data1);
                console.log(data);
                
                // Check for blocked channels from backend
                if(data.blocked_channels) {
                    console.log('✅ BLOCKED CHANNELS RECEIVED FROM API:', data.blocked_channels);
                    localStorage.setItem('blocked_channels', JSON.stringify(data.blocked_channels));
                } else if(data.blocklist) {
                    console.log('✅ BLOCKLIST RECEIVED FROM API:', data.blocklist);
                    localStorage.setItem('blocked_channels', JSON.stringify(data.blocklist));
                } else if(data.blocked_keywords) {
                    console.log('✅ BLOCKED KEYWORDS RECEIVED FROM API:', data.blocked_keywords);
                    localStorage.setItem('blocked_channels', JSON.stringify(data.blocked_keywords));
                } else {
                    console.log('⚠️ NO BLOCKLIST FOUND IN API RESPONSE');
                    localStorage.setItem('blocked_channels', JSON.stringify([]));
                }
                
                // Store blocked movies and series if available
                if(data.blocked_movies) {
                    localStorage.setItem('blocked_movies', JSON.stringify(data.blocked_movies));
                }
                if(data.blocked_series) {
                    localStorage.setItem('blocked_series', JSON.stringify(data.blocked_series));
                }
                
                // Store terms of use if available
                if(data.terms) {
                    console.log('✅ TERMS OF USE RECEIVED FROM API:', data.terms);
                    localStorage.setItem('terms_data', JSON.stringify(data.terms));
                }
                
                localStorage.setItem(storage_id+'api_data',JSON.stringify(data));
                that.checkAndShowTerms(data);
            },
            error: function(error){
                var local_data=localStorage.getItem(storage_id+'api_data');
                if(local_data)
                    that.startApp(JSON.parse(local_data));
                else{
                    that.hideLoadImage();
                    // Update MAC address in network issue modal
                    if(typeof mac_address !== 'undefined' && mac_address) {
                        $('#network-issue-mac-address').text(mac_address);
                    }
                    
                    // Hide or show Choose Playlist button based on playlist count
                    var playlistCount = playlist_urls ? playlist_urls.length : 0;
                    var choosePlaylistBtn = $('.network-issue-btn').filter(function() {
                        return $(this).attr('onclick') === 'login_page.showPlaylistSelectionModal()';
                    });
                    
                    if (playlistCount > 1) {
                        choosePlaylistBtn.show();
                    } else {
                        choosePlaylistBtn.hide();
                    }
                    
                    $('#network-issue-container').show();
                    if(keys.focused_part!=='turn_off_modal')
                        that.hoverNetworkIssueBtn(0);
                }
            }
        });
    },
    // Helper function to convert string to MAC format
    stringToMacAddress: function(inputString) {
        // Remove all non-alphanumeric characters and convert to uppercase
        var cleanString = inputString.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Take first 12 characters, pad with zeros if needed
        while(cleanString.length < 12) {
            cleanString += '0';
        }
        cleanString = cleanString.substring(0, 12);
        
        // Format as MAC address
        var macAddress = '';
        for(var i = 0; i < 12; i += 2) {
            if(i > 0) macAddress += ':';
            macAddress += cleanString.substring(i, i + 2);
        }
        
        return macAddress;
    },

    // Samsung fallback system: Ethernet -> DUID -> Tizen ID -> Hardcoded
    getSamsungMacAddress: function() {
        var that = this;
        
        // Check if we're actually in a Tizen environment
        if (typeof tizen === 'undefined' || !tizen.systeminfo) {
            console.log('Samsung: Not in Tizen environment (browser/web), using hardcoded MAC');
            that.getSamsungHardcodedMac();
            return;
        }
        
        // Try Ethernet first (primary method)
        try {
            tizen.systeminfo.getPropertyValue('ETHERNET_NETWORK', function (data) {
                if (data !== undefined && typeof data.macAddress !== 'undefined' && data.macAddress) {
                    console.log('Samsung: Using Ethernet MAC address');
                    mac_address = data.macAddress;
                    that.fetchPlaylistInformation();
                } else {
                    // Fallback to DUID
                    that.getSamsungDuidMac();
                }
            }, function(error) {
                console.log('Samsung: Ethernet failed, trying DUID');
                that.getSamsungDuidMac();
            });
        } catch (e) {
            console.log('Samsung: Ethernet exception, trying DUID');
            that.getSamsungDuidMac();
        }
    },

    getSamsungDuidMac: function() {
        var that = this;
        
        try {
            tizen.systeminfo.getPropertyValue('DUID', function (data) {
                if (data !== undefined && typeof data.duid !== 'undefined' && data.duid) {
                    console.log('Samsung: Using DUID for MAC address');
                    var encodedDuid = btoa(data.duid); // Base64 encoding
                    mac_address = that.stringToMacAddress(encodedDuid);
                    that.fetchPlaylistInformation();
                } else {
                    // Fallback to Tizen ID
                    that.getSamsungTizenIdMac();
                }
            }, function(error) {
                console.log('Samsung: DUID failed, trying Tizen ID');
                that.getSamsungTizenIdMac();
            });
        } catch (e) {
            console.log('Samsung: DUID exception, trying Tizen ID');
            that.getSamsungTizenIdMac();
        }
    },

    getSamsungTizenIdMac: function() {
        var that = this;
        
        try {
            tizen.systeminfo.getPropertyValue('BUILD', function (data) {
                if (data !== undefined && typeof data.tizenID !== 'undefined' && data.tizenID) {
                    console.log('Samsung: Using Tizen ID for MAC address');
                    var encodedTizenId = btoa(data.tizenID); // Base64 encoding
                    mac_address = that.stringToMacAddress(encodedTizenId);
                    that.fetchPlaylistInformation();
                } else {
                    // Final fallback - hardcoded MAC
                    that.getSamsungHardcodedMac();
                }
            }, function(error) {
                console.log('Samsung: Tizen ID failed, using hardcoded MAC');
                that.getSamsungHardcodedMac();
            });
        } catch (e) {
            console.log('Samsung: Tizen ID exception, using hardcoded MAC');
            that.getSamsungHardcodedMac();
        }
    },

    getSamsungHardcodedMac: function() {
        console.log('Samsung: Using hardcoded MAC address');
        mac_address = '52:54:00:12:34:59'; // Hardcoded fallback
        this.fetchPlaylistInformation();
    },

    // LG fallback system: LGUDID -> Ethernet -> Hardcoded
    getLgMacAddress: function() {
        var that = this;
        
        // Check if we're actually in a WebOS environment
        if (typeof webOS === 'undefined' || !webOS.service || typeof window.PalmServiceBridge === 'undefined') {
            console.log('LG: Not in WebOS environment, using hardcoded MAC');
            that.getLgHardcodedMac();
            return;
        }
        
        // Try LGUDID first (current primary method)
        try {
            webOS.service.request("luna://com.webos.service.sm", {
                method: "deviceid/getIDs",
                parameters: {
                    "idType": ["LGUDID"]
                },
                onSuccess: function (inResponse) {
                    if (inResponse && inResponse.idList && inResponse.idList.length > 0 && inResponse.idList[0].idValue) {
                        console.log('LG: Using LGUDID for MAC address');
                        mac_address = "";
                        var temp = inResponse.idList[0].idValue.replace(/['-]+/g, '');
                        for(var i = 0; i <= 5; i++){
                            mac_address += temp.substr(i*2, 2);
                            if(i < 5)
                                mac_address += ":";
                        }
                        that.fetchPlaylistInformation();
                    } else {
                        // Fallback to Ethernet
                        that.getLgEthernetMac();
                    }
                },
                onFailure: function (inError) {
                    console.log('LG: LGUDID failed, trying Ethernet');
                    that.getLgEthernetMac();
                }
            });
        } catch (e) {
            console.log('LG: LGUDID exception, trying Ethernet');
            that.getLgEthernetMac();
        }
    },

    getLgEthernetMac: function() {
        var that = this;
        
        try {
            // Try to get ethernet info on LG
            webOS.service.request("luna://com.webos.service.connectionmanager", {
                method: "getStatus",
                parameters: {},
                onSuccess: function (inResponse) {
                    if (inResponse && inResponse.wired && inResponse.wired.macAddress) {
                        console.log('LG: Using Ethernet MAC address');
                        mac_address = inResponse.wired.macAddress;
                        that.fetchPlaylistInformation();
                    } else {
                        // Final fallback - hardcoded MAC
                        that.getLgHardcodedMac();
                    }
                },
                onFailure: function (inError) {
                    console.log('LG: Ethernet failed, using hardcoded MAC');
                    that.getLgHardcodedMac();
                }
            });
        } catch (e) {
            console.log('LG: Ethernet exception, using hardcoded MAC');
            that.getLgHardcodedMac();
        }
    },

    getLgHardcodedMac: function() {
        console.log('LG: Using hardcoded MAC address');
        mac_address = '52:54:00:12:34:59'; // Different hardcoded MAC for LG
        this.fetchPlaylistInformation();
    },

    getPlayListDetail:function(){
        this.network_btn_doms=$('.network-issue-btn');
        this.showLoadImage();
        $('#network-issue-container').hide();
        var that=this;
        var keys=this.keys;
        keys.focused_part="playlist_selection";
        mac_address='52:54:00:12:34:58'; // Default fallback
        
        if(platform==='samsung'){
            that.getSamsungMacAddress();
        }
        else if(platform==='lg'){
            that.getLgMacAddress();
        }
    },
    hoverNetworkIssueBtn:function(index){
        var keys=this.keys;
        keys.focused_part='network_issue_btn';

        // Always refresh button references to include dynamically added buttons
        this.network_btn_doms = $('.network-issue-btn');

        // Clear ONLY network issue button active states, not playlist items
        $('.network-issue-btn').removeClass('active');

        // Ensure index is within bounds
        if(index >= 0 && index < this.network_btn_doms.length) {
            keys.network_issue_btn = index;
            $(this.network_btn_doms[index]).addClass('active');
        } else {
            // If index is out of bounds, default to first button
            keys.network_issue_btn = 0;
            if(this.network_btn_doms.length > 0) {
                $(this.network_btn_doms[0]).addClass('active');
            }
        }
    },
    login:function(){
        var keys=this.keys;
        if(mac_valid){
            var playlist_url_index=settings.playlist_url_index;
            keys.playlist_selection=0;
            if(playlist_url_index!=null && playlist_url_index!==''){
                if(typeof playlist_urls[playlist_url_index]!="undefined"){
                    keys.playlist_selection=playlist_url_index;
                }
            }
            settings.saveSettings('playlist_url', playlist_urls[keys.playlist_selection],'');
            settings.saveSettings('playlist_url_index', keys.playlist_selection,'');
            parseM3uUrl();
            this.proceed_login();
        }
        else{
            showToast("Sorry","You can not use our service now, please extend your expire date by paying us")
        }
    },
    fallbackToLocalDemo: function() {
        var that = this;
        console.log("Falling back to local demo playlist");

        // Set up demo playlist configuration
        settings.playlist_type = "type1";
        settings.playlist_url = "demoo.m3u";
        api_host_url = settings.playlist_url;

        // Clear any existing data to force fresh load
        localStorage.removeItem(storage_id+'api_data');

        // Hide loading and network issue dialog
        that.hideLoadImage();
        $('#network-issue-container').hide();

        // Show loading while processing demo playlist
        that.showLoadImage();

        // Proceed with login using demo playlist
        that.proceed_login();

        // Show a toast to inform user they're using demo content
        setTimeout(function() {
            showToast("Demo Mode", "You are now using demo content with limited functionality");
        }, 2000);
    },
    convertXtremeToM3u:function(){
        settings.playlist_type="type1";
        api_host_url=settings.playlist_url;
        this.proceed_login();
    },
    goHomePageWithPlaylistError:function (){
        LiveModel.setCategories([]);
        VodModel.setCategories([]);
        SeriesModel.setCategories([]);
        LiveModel.setMovies([]);
        VodModel.setMovies([]);
        SeriesModel.setMovies([]);
        LiveModel.insertMoviesToCategories();
        VodModel.insertMoviesToCategories();
        SeriesModel.insertMoviesToCategories();

        playlist_succeed=false;
        $('#turn-off-modal').modal('hide');
        $('#playlist-error').show();
        // this.hideLoadImage();
        this.goToHomePage();
        if(platform==='samsung')
            home_page.hoverToMainMenu(6);
        else
            home_page.hoverToMainMenu(5);
        home_page.handleMenuClick();
        home_page.hoverSettingModal(5);
        home_page.handleMenuClick();
    },
    proceed_login:function(){
        // Prevent proceed_login when account is expired
        if(!mac_valid) {
            console.log("Account expired - blocking proceed_login to prevent network errors");
            this.hideLoadImage();
            return;
        }
        
        $('#playlist-error').hide();
        playlist_succeed=true;
        var that=this;
        this.showLoadImage();
        var playlist_type=settings.playlist_type;
        var client_offset = moment(new Date()).utcOffset();
        if(playlist_type==="xtreme"){
            var  prefix_url=api_host_url+'/player_api.php?username='+user_name+'&password='+password+'&action=';
            var login_url=prefix_url.replace("&action=","");
            $.ajax({
                method:'get',
                url:login_url,
                success:function (data) {
                    if(typeof  data.user_info!="undefined")
                    {
                        saveData('user_info', data.user_info);
                        if(data.user_info.auth==0 || (typeof data.user_info.status!='undefined' && data.user_info.status==='Expired')){
                            that.hideLoadImage();
                            $('#login-page-error-playlists-container').show();
                            that.keys.focused_part="playlist_selection";
                        }else{
                            $.when(
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_streams',
                                    success:function (data) {
                                        LiveModel.setMovies(data);
                                    },
                                    error:function(error){
                                        // that.hideLoadImage();
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_live_categories',
                                    success:function (data) {
                                        LiveModel.setCategories(data);
                                    },
                                    error:function(error){
                                        // that.hideLoadImage();
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_categories',
                                    success:function (data) {
                                        VodModel.setCategories(data);
                                    },
                                    error:function(error){
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series_categories',
                                    success:function (data) {
                                        SeriesModel.setCategories(data);
                                        SeriesModel.movie_key="series_id";
                                    },
                                    error:function(error){
                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_vod_streams',
                                    success:function (data) {
                                        VodModel.setMovies(data);
                                    },
                                    error:function(error){

                                    }
                                }),
                                $.ajax({
                                    method:'get',
                                    url:prefix_url+'get_series',
                                    success:function (data) {
                                        SeriesModel.setMovies(data);
                                    },
                                    error:function(error){
                                    }
                                })
                            ).then(function () {
                                LiveModel.insertMoviesToCategories();
                                VodModel.insertMoviesToCategories();
                                SeriesModel.insertMoviesToCategories();
                                $('#turn-off-modal').modal('hide');
                                // that.hideLoadImage();
                                that.goToHomePage();
                            }).fail(function (error) {
                                settings.playlist_type="type1";
                                api_host_url=settings.playlist_url;
                                console.log(error,"convert to normal m3u");
                                that.proceed_login();
                                return;
                            })
                        }
                    }else{
                        that.convertXtremeToM3u();
                    }
                    if(typeof  data.server_info!="undefined"){
                        saveData('server_info',data.server_info)
                        calculateTimeDifference(data.server_info.time_now,data.server_info.timestamp_now)
                    }
                },
                error:function(error){
                    that.convertXtremeToM3u();
                }
            })
        }
        else if(playlist_type==='type1'){
            $.when(
                $.ajax({
                    method:'get',
                    url:api_host_url,
                    success:function (data) {
                        parseM3uResponse("type1",data)
                    },
                    error:function(error){

                    },
                })
            ).then(function () {
                // that.hideLoadImage();
                that.goToHomePage();

            }).fail(function () {
                that.hideLoadImage();
                // Don't show network issue dialog if account is expired
                if(mac_valid) {
                    that.showNetworkIssueWithPlaylistOptions();
                }
            })
        }
    },
    showNetworkIssueWithPlaylistOptions: function() {
        var that = this;
        var keys = this.keys;

        // Update MAC address in network issue modal
        if(typeof mac_address !== 'undefined' && mac_address) {
            $('#network-issue-mac-address').text(mac_address);
        }

        // Update network issue text with MAC address
        $('#network-issue-text').html(
            'We couldn\'t load your playlist. This may be due to one of the following reasons:<br>' +
            '🔌 Network issue – Please check your internet connection.<br>' +
            '🌐 Playlist server is temporarily unavailable – Ensure your playlist is correct or contact your provider.<br><br>' +
            'You can continue using the app with limited functionality, or tap "Retry" to try loading your playlist again.'
        );

        // Hide or show Choose Playlist button based on playlist count
        var playlistCount = playlist_urls ? playlist_urls.length : 0;
        console.log("Playlist count:", playlistCount, "playlist_urls:", playlist_urls);
        
        // Find the Choose Playlist button by its onclick attribute
        var choosePlaylistBtn = $('.network-issue-btn').filter(function() {
            return $(this).attr('onclick') === 'login_page.showPlaylistSelectionModal()';
        });
        
        if (playlistCount > 1) {
            // Show Choose Playlist button when multiple playlists exist
            choosePlaylistBtn.show();
            console.log("Showing Choose Playlist button - multiple playlists available");
        } else {
            // Hide Choose Playlist button when only one or no playlist exists
            choosePlaylistBtn.hide();
            console.log("Hiding Choose Playlist button - only one or no playlist available");
        }

        // Show modal first, then handle focus after a brief delay to prevent freeze
        $('#network-issue-container').hide().fadeIn(300);

        // Refresh network button references after modal is fully shown
        setTimeout(function() {
            that.network_btn_doms = $('.network-issue-btn:visible');
            keys.focused_part = "network_issue_btn";
            keys.network_issue_btn = 0;
            $(that.network_btn_doms).removeClass('active');
            if(that.network_btn_doms.length > 0) {
                $(that.network_btn_doms[0]).addClass('active');
            }
        }, 350);
    },
    selectPlaylistFromError: function(playlistIndex) {
        var that = this;
        var keys = this.keys;

        // Only clear network issue button states, don't touch playlist items
        $('.network-issue-btn').removeClass('active');

        // Update selected playlist
        keys.playlist_selection = playlistIndex;
        settings.saveSettings('playlist_url', playlist_urls[playlistIndex], '');
        settings.saveSettings('playlist_url_index', playlistIndex, '');
        parseM3uUrl();

        // Hide playlist selection modal and network issue dialog
        $('#playlist-selection-modal').hide();
        $('#network-issue-container').hide();
        that.showLoadImage();
        that.proceed_login();
    },
    showPlaylistSelectionModal: function() {
        var that = this;
        var keys = this.keys;

        if (playlist_urls && playlist_urls.length > 1) {
            var playlistOptionsHtml = '';
            for (var i = 0; i < playlist_urls.length; i++) {
                var isSelected = i === keys.playlist_selection ? ' playlist-selected' : '';
                playlistOptionsHtml += '<div class="playlist-modal-item' + isSelected + '" ' +
                    'data-playlist-index="' + i + '" ' +
                    'onclick="login_page.selectPlaylistFromError(' + i + ')" ' +
                    'onmouseenter="login_page.hoverPlaylistModalItem(' + i + ')">' +
                    'Playlist ' + (i + 1) + 
                    (i === keys.playlist_selection ? ' (Current)' : '') +
                    '</div>';
            }

            $('#playlist-modal-items').html(playlistOptionsHtml);
            $('#playlist-selection-modal').show();

            // Set focus to playlist selection
            keys.focused_part = "playlist_modal";
            keys.playlist_modal_selection = keys.playlist_selection;

            // Highlight current selection
            $('.playlist-modal-item').removeClass('active');
            $('.playlist-modal-item[data-playlist-index="' + keys.playlist_selection + '"]').addClass('active');
        }
    },
    hoverPlaylistModalItem: function(index) {
        var keys = this.keys;
        keys.focused_part = "playlist_modal";
        keys.playlist_modal_selection = index;

        $('.playlist-modal-item').removeClass('active');
        $('.playlist-modal-item[data-playlist-index="' + index + '"]').addClass('active');
    },
    handleMenuClick:function(){
        var keys=this.keys;
        if(keys.focused_part==="playlist_selection"){
            if(mac_valid){
                settings.saveSettings('playlist_url', playlist_urls[keys.playlist_selection],'');
                settings.saveSettings('playlist_url_index', keys.playlist_selection,'');
                parseM3uUrl();
                this.proceed_login();
            }
            else {
                showToast("Sorry","You can not use our service now, please activate your device at https://flixapp.net/activation and restart your app");
            }
        }
        else if(keys.focused_part==="turn_off_modal"){
            if(keys.turn_off_modal==0){
                $('#turn-off-modal').modal('hide');
                closeApp();
            }
            else{
                $('#turn-off-modal').modal('hide');
                var network_display=$('#network-issue-container').css('display');
                if(network_display!=='block')
                    this.keys.focused_part="playlist_selection";
                else
                    this.keys.focused_part="network_issue_btn";
            }
        }
        else if(keys.focused_part==="network_issue_btn"){
            $(this.network_btn_doms[keys.network_issue_btn]).trigger('click');
        }
        else if(keys.focused_part==="playlist_modal"){
            var selectedItem = $('.playlist-modal-item')[keys.playlist_modal_selection];
            if(selectedItem) {
                $(selectedItem).trigger('click');
            }
        }
        else if(keys.focused_part==="terms_buttons"){
            if(keys.terms_button_selection===0){
                this.acceptTerms();
            } else {
                this.declineTerms();
            }
        }
    },
    handleMenuUpDown:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="playlist_selection"){
            // Remove active class from all playlist items first
            $(this.playlist_doms).removeClass('active');

            keys.playlist_selection+=increment;
            if(keys.playlist_selection<0)
                keys.playlist_selection=playlist_urls.length-1;
            if(keys.playlist_selection>=playlist_urls.length)
                keys.playlist_selection=0;

            // Add active class only to the selected item
            $(this.playlist_doms[keys.playlist_selection]).addClass('active');
            moveScrollPosition($('#login-playlist-items-container'),this.playlist_doms[keys.playlist_selection],'vertical',false);
        }
        else if(keys.focused_part==="turn_off_modal"){
            keys.turn_off_modal+=increment;
            var buttons=$('#turn-off-modal').find('button');
            if(keys.turn_off_modal<0)
                keys.turn_off_modal=1;
            if(keys.turn_off_modal>1)
                keys.turn_off_modal=0;
            $(buttons).removeClass('active');
            $(buttons[keys.turn_off_modal]).addClass('active');
        }
        else if(keys.focused_part==="network_issue_btn"){
            // Refresh button references before navigation
            this.network_btn_doms = $('.network-issue-btn');

            keys.network_issue_btn+=increment;
            if(keys.network_issue_btn<0)
                keys.network_issue_btn=this.network_btn_doms.length-1;
            if(keys.network_issue_btn>=this.network_btn_doms.length)
                keys.network_issue_btn=0;

            // Clear all active states first
            $('.network-issue-btn').removeClass('active');

            // Set active state only on the selected button
            if(this.network_btn_doms.length > 0 && keys.network_issue_btn < this.network_btn_doms.length) {
                $(this.network_btn_doms[keys.network_issue_btn]).addClass('active');
            }
        }
        else if(keys.focused_part==="playlist_modal"){
            var playlistItems = $('.playlist-modal-item');
            keys.playlist_modal_selection+=increment;
            if(keys.playlist_modal_selection<0)
                keys.playlist_modal_selection=playlistItems.length-1;
            if(keys.playlist_modal_selection>=playlistItems.length)
                keys.playlist_modal_selection=0;

            // Clear all active states first
            playlistItems.removeClass('active');

            // Set active state only on the selected item
            $(playlistItems[keys.playlist_modal_selection]).addClass('active');
        }
        else if(keys.focused_part==="terms_buttons"){
            // Scroll the terms content with UP/DOWN arrows
            var termsContent = $('#terms-modal .modal-body');
            var scrollAmount = 100; // Pixels to scroll per key press
            var currentScroll = termsContent.scrollTop();
            var newScroll = currentScroll + (increment * scrollAmount);
            termsContent.scrollTop(newScroll);
        }
    },
    handleMenuLeftRight:function(increment){
        var keys=this.keys;
        if(keys.focused_part==="network_issue_btn"){
            // Refresh button references before navigation
            this.network_btn_doms = $('.network-issue-btn');

            keys.network_issue_btn+=increment;
            if(keys.network_issue_btn<0)
                keys.network_issue_btn=0;
            else if(keys.network_issue_btn>=this.network_btn_doms.length)
                keys.network_issue_btn=this.network_btn_doms.length-1;

            // Clear all active states first
            $('.network-issue-btn').removeClass('active');

            // Set active state only on the selected button
            if(this.network_btn_doms.length > 0 && keys.network_issue_btn < this.network_btn_doms.length) {
                $(this.network_btn_doms[keys.network_issue_btn]).addClass('active');
            }
        }
        if(keys.focused_part==="turn_off_modal"){
            keys.turn_off_modal+=increment;
            var buttons=$('#turn-off-modal').find('button');
            if(keys.turn_off_modal<0)
                keys.turn_off_modal=1;
            if(keys.turn_off_modal>1)
                keys.turn_off_modal=0;
            $(buttons).removeClass('active');
            $(buttons[keys.turn_off_modal]).addClass('active');
        }
        if(keys.focused_part==="terms_buttons"){
            keys.terms_button_selection+=increment;
            if(keys.terms_button_selection<0)
                keys.terms_button_selection=1;
            if(keys.terms_button_selection>1)
                keys.terms_button_selection=0;
            $(this.terms_buttons).removeClass('active');
            $(this.terms_buttons[keys.terms_button_selection]).addClass('active');
        }
    },
    HandleKey:function(e) {
        switch(e.keyCode){
            case tvKey.DOWN:
                this.handleMenuUpDown(1);
                break;
            case tvKey.UP:
                this.handleMenuUpDown(-1);
                break;
            case tvKey.LEFT:
                this.handleMenuLeftRight(-1);
                break;
            case tvKey.RIGHT:
                this.handleMenuLeftRight(1);
                break;
            case tvKey.ENTER:
                this.handleMenuClick();
                break;
            case tvKey.RETURN:
                if(this.keys.focused_part==="playlist_modal"){
                    // When playlist modal is open, RETURN key should only close the modal
                    $('#playlist-selection-modal').hide();
                    this.keys.focused_part="network_issue_btn";
                    // Refresh network button focus
                    this.network_btn_doms = $('.network-issue-btn');
                    $('.network-issue-btn').removeClass('active');
                    if(this.network_btn_doms[this.keys.network_issue_btn]) {
                        $(this.network_btn_doms[this.keys.network_issue_btn]).addClass('active');
                    }
                }
                else if(this.keys.focused_part==="network_issue_btn"){
                    // When network issue modal is open, RETURN key should trigger "Continue Anyway"
                    this.fallbackToLocalDemo();
                }
                else if(this.keys.focused_part==="playlist_selection"){
                    $('#turn-off-modal').modal('show');
                    this.keys.focused_part="turn_off_modal";
                    this.keys.turn_off_modal=0;
                    var buttons=$('#turn-off-modal').find('button');
                    $(buttons).removeClass('active');
                    $(buttons[0]).addClass('active');
                }
                else if(this.keys.focused_part==="turn_off_modal"){
                    $('#turn-off-modal').modal('hide');
                    var network_display=$('#network-issue-container').css('display');
                    if(network_display!=='block')
                        this.keys.focused_part="playlist_selection";
                    else
                        this.keys.focused_part="network_issue_btn";
                }
                break;
        }
    },
    hoverPlaylistItem:function(index){
        var keys=this.keys;
        keys.focused_part="playlist_selection";

        // Only clear playlist active states, not network issue buttons
        $('.login-playlist-item-wrapper').removeClass('active');

        // Set the new selection
        keys.playlist_selection=index;
        if(this.playlist_doms && this.playlist_doms[index]) {
            $(this.playlist_doms[index]).addClass('active');
        }
    },
    tryPlaylistUrl: function(index) {
        var that = this;
        var keys = this.keys;

        // Clear all active states first
        $(this.network_btn_doms).removeClass('active');
        $(this.playlist_doms).removeClass('active');

        // Update selection to the clicked playlist
        keys.playlist_selection = index;
        keys.network_issue_btn = index;

        // Update visual selection
        $(this.network_btn_doms[index]).addClass('active');

        // Update playlist URL
        settings.playlist_url = playlist_urls[index];
        parseM3uUrl();

        // Hide network issue dialog and try new playlist
        $('#network-issue-container').hide();
        that.showLoadImage();
        that.proceed_login();
    },
    checkAndShowTerms: function(data) {
        var that = this;
        var termsData = localStorage.getItem('terms_data');
        var termsAccepted = localStorage.getItem('terms_accepted');
        var acceptedVersion = localStorage.getItem('terms_accepted_version');
        
        if(!termsData) {
            console.log('⚠️ NO TERMS DATA AVAILABLE');
            that.startApp(data);
            return;
        }
        
        var terms = JSON.parse(termsData);
        var currentVersion = terms.version || '1.0';
        
        // Check if terms need to be shown
        if(termsAccepted === 'true' && acceptedVersion === currentVersion) {
            console.log('✅ TERMS ALREADY ACCEPTED (Version: ' + currentVersion + ')');
            that.startApp(data);
        } else {
            console.log('📜 SHOWING TERMS OF USE (Version: ' + currentVersion + ')');
            that.showTermsModal(terms, data);
        }
    },
    showTermsModal: function(terms, data) {
        var that = this;
        that.app_data = data;
        
        $('#terms-content').text(terms.content || 'Terms content not available.');
        if(terms.updated_date) {
            $('#terms-version').text('Version ' + (terms.version || '1.0') + ' | Last updated: ' + terms.updated_date);
        } else {
            $('#terms-version').text('Version ' + (terms.version || '1.0'));
        }
        
        this.terms_buttons = $('.terms-action-btn');
        this.keys.focused_part = 'terms_buttons';
        this.keys.terms_button_selection = 0;
        
        $('#terms-modal').modal({
            backdrop: 'static',
            keyboard: false
        });
        $('#terms-modal').modal('show');
        
        $(this.terms_buttons).removeClass('active');
        $(this.terms_buttons[0]).addClass('active');
    },
    acceptTerms: function() {
        var termsData = localStorage.getItem('terms_data');
        if(termsData) {
            var terms = JSON.parse(termsData);
            var version = terms.version || '1.0';
            
            localStorage.setItem('terms_accepted', 'true');
            localStorage.setItem('terms_accepted_version', version);
            localStorage.setItem('terms_accepted_date', new Date().toISOString());
            
            console.log('✅ TERMS ACCEPTED (Version: ' + version + ')');
            showToast('Terms Accepted', 'You have accepted the Terms of Use');
        }
        
        $('#terms-modal').modal('hide');
        this.startApp(this.app_data);
    },
    declineTerms: function() {
        console.log('❌ TERMS DECLINED - EXITING APP');
        showToast('Terms Declined', 'You must accept the Terms of Use to continue');
        
        setTimeout(function() {
            $('#terms-modal').modal('hide');
            
            if(platform === 'samsung') {
                try {
                    tizen.application.getCurrentApplication().exit();
                } catch(e) {
                    console.log('Exit not available:', e);
                    window.close();
                }
            } else if(platform === 'lg') {
                try {
                    webOS.platformBack();
                } catch(e) {
                    console.log('Exit not available:', e);
                    window.close();
                }
            } else {
                window.close();
            }
        }, 2000);
    },
    hoverTermsButton: function(index) {
        this.keys.terms_button_selection = index;
        this.keys.focused_part = 'terms_buttons';
        $(this.terms_buttons).removeClass('active');
        $(this.terms_buttons[index]).addClass('active');
    },
}