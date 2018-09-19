var myApp = myApp || {};
myApp.updateDecimalClock = (id) => {
    const getDecimalTimeString = (d) => {
        const secondsSinceMidnight = 3600*d.getHours() + 60*d.getMinutes() + d.getSeconds();
        let metricSeconds = secondsSinceMidnight * 100000 / 86400;
        const metricHours = Math.floor(metricSeconds / 10000);
        metricSeconds -= 10000 * metricHours;
        const metricMinutes = Math.floor(metricSeconds / 100);
        metricSeconds = Math.floor(metricSeconds - 100 * metricMinutes);
        return `${metricHours}:${metricMinutes<10?`0${metricMinutes}`:metricMinutes}:${metricSeconds<10?`0${metricSeconds}`:metricSeconds}`
    }
    const tick = () => {
        document.getElementById(id).innerHTML = getDecimalTimeString(new Date())
    };

    tick();
    window.setInterval(tick, 842); //roughly one decimal second
}

myApp.setRepublicanDate = (id) => {
    const republicanDate = new FlorealDate();
    document.getElementById(id).innerHTML = republicanDate.isComplementaryDay() ?
          `${republicanDate.toFullDateString()}<br>${republicanDate.dayName()}`
        : `${republicanDate.dayName()} ${republicanDate.toFullDateString()}<br>${republicanDate.dayTitle()}`;
}
