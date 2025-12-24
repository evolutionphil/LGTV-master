"use strict";
function getTodayDate(format) {
    var date=new Date();
    var moment_date=moment(date);
    return moment_date.format(format);
}

function getLocalChannelTime(channel_time,epg_offset_minute) {
    var date=moment(channel_time);
    return date.add(time_difference_with_server+epg_offset_minute, 'minute');
}
