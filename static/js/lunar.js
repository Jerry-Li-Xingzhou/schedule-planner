// Chinese Lunar Calendar + Solar Terms + Festivals

const LUNAR_DATA = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06aa0,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
    0x0d520
];

const LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
const LUNAR_DAYS = ['','初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

// 24 Solar Terms (approximate dates, D = day offset from month start)
const SOLAR_TERMS = {
    0: [{d:5,n:'小寒'},{d:20,n:'大寒'}],
    1: [{d:4,n:'立春'},{d:19,n:'雨水'}],
    2: [{d:6,n:'惊蛰'},{d:21,n:'春分'}],
    3: [{d:5,n:'清明'},{d:20,n:'谷雨'}],
    4: [{d:6,n:'立夏'},{d:21,n:'小满'}],
    5: [{d:6,n:'芒种'},{d:21,n:'夏至'}],
    6: [{d:7,n:'小暑'},{d:23,n:'大暑'}],
    7: [{d:7,n:'立秋'},{d:23,n:'处暑'}],
    8: [{d:8,n:'白露'},{d:23,n:'秋分'}],
    9: [{d:8,n:'寒露'},{d:23,n:'霜降'}],
    10:[{d:7,n:'立冬'},{d:22,n:'小雪'}],
    11:[{d:7,n:'大雪'},{d:22,n:'冬至'}],
};

// Lunar festivals: {month, day, name}
const LUNAR_FESTIVALS = [
    [1,1,'春节'],[1,15,'元宵节'],[5,5,'端午节'],[7,7,'七夕'],[7,15,'中元节'],
    [8,15,'中秋节'],[9,9,'重阳节'],[12,30,'除夕'],[12,29,'除夕'],
];
// Solar festivals
const SOLAR_FESTIVALS = {
    '01-01':'元旦','02-14':'情人节','03-08':'妇女节','04-01':'愚人节',
    '04-05':'清明节','05-01':'劳动节','06-01':'儿童节',
    '10-01':'国庆节','12-25':'圣诞节',
};

function lunarYearDays(y) {let s=348;for(let i=0x8000;i>0x8;i>>=1)s+=(LUNAR_DATA[y-1900]&i)?1:0;return s+lunarLeapDays(y);}
function lunarLeapMonth(y) {return LUNAR_DATA[y-1900]&0xf;}
function lunarLeapDays(y) {return lunarLeapMonth(y)?((LUNAR_DATA[y-1900]&0x10000)?30:29):0;}
function lunarMonthDays(y,m) {return(LUNAR_DATA[y-1900]&(0x10000>>m))?30:29;}

function _solarToLunarObj(year, month, day) {
    const base = new Date(1900, 0, 31);
    const target = new Date(year, month - 1, day);
    let offset = Math.round((target - base) / 86400000);
    let ly, lm, ld, isLeap = false;
    for (ly = 1900; ly < 2101 && offset > 0; ly++) {
        const d = lunarYearDays(ly);
        if (offset < d) break;
        offset -= d;
    }
    const leap = lunarLeapMonth(ly);
    for (lm = 1; lm < 13 && offset > 0; lm++) {
        if (leap > 0 && lm === leap + 1 && !isLeap) {
            lm--; isLeap = true;
            const d = lunarLeapDays(ly);
            if (offset < d) break;
            offset -= d; isLeap = false;
        }
        const d = lunarMonthDays(ly, lm);
        if (offset < d) break;
        offset -= d;
    }
    ld = offset + 1;
    return { year: ly, month: lm, day: ld, isLeap };
}

function solarToLunar(year, month, day) {
    const l = _solarToLunarObj(year, month, day);
    if (l.day === 1) return LUNAR_MONTHS[l.month - 1];
    return LUNAR_DAYS[l.day];
}

function getSolarTerm(month, day) {
    const terms = SOLAR_TERMS[month];
    if (!terms) return null;
    for (const t of terms) {
        if (t.d === day) return t.n;
    }
    return null;
}

function getFestival(year, month, day) {
    const mmdd = String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    // Mother's Day: 2nd Sunday of May
    // Father's Day: 3rd Sunday of June
    const d = new Date(year, month-1, day);
    if (month === 5 && d.getDay() === 0) {
        const first = new Date(year, 4, 1);
        const sun = (7 - first.getDay()) % 7 + 1;
        if (day === sun + 7) return '母亲节';
    }
    if (month === 6 && d.getDay() === 0) {
        const first = new Date(year, 5, 1);
        const sun = (7 - first.getDay()) % 7 + 1;
        if (day === sun + 14) return '父亲节';
    }
    // Lunar festivals
    const lunar = _solarToLunarObj(year, month, day);
    for (const [lm, ld, name] of LUNAR_FESTIVALS) {
        if (lunar.month === lm && lunar.day === ld) return name;
        // 除夕: last day of year
        if (lm === 12 && ld === 30 && lunar.month === 12 && lunar.day === 30) return name;
        if (lm === 12 && ld === 29 && lunar.month === 12 && lunar.day === 29 && lunarMonthDays(lunar.year, 12) === 29) return '除夕';
    }
    return SOLAR_FESTIVALS[mmdd] || null;
}

// Get enriched display info
function getLunarInfo(year, month, day) {
    const lunarText = solarToLunar(year, month, day);
    const term = getSolarTerm(month, day);
    const festival = getFestival(year, month, day);
    return { lunar: lunarText, term, festival };
}
