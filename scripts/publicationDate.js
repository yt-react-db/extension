import { parse } from "date-fns";

function parseDate(dateString, locale) {
    return parse(dateString, 'd LLL y', new Date(), { locale });
}

const frenchDateStr = '7 avr. 2023';
const parsedDate = parseDate(frenchDateStr, require('date-fns/locale/fr'));
console.log(parsedDate); // Output: 2014-04-07T00:00:00.000Z

// source: https://developers.google.com/youtube/v3/docs/i18nLanguages/list
// locales used by youtube "af", "am", "ar", "as", "az", "be", "bg", "bn", "bs", "ca", "cs", "da", "de", "el", "en-GB", "en-IN", "en", "es", "es-419", "es-US", "et", "eu", "fa", "fi", "fil", "fr-CA", "fr", "gl", "gu", "hi", "hr", "hu", "hy", "id", "is", "it", "iw", "ja", "ka", "kk", "km", "kn", "ko", "ky", "lo", "lt", "lv", "mk", "ml", "mn", "mr", "ms", "my", "no", "ne", "nl", "or", "pa", "pl", "pt", "pt-PT", "ro", "ru", "si", "sk", "sl", "sq", "sr-Latn", "sr", "sv", "sw", "ta", "te", "th", "tr", "uk", "ur", "uz", "vi", "zh-CN"