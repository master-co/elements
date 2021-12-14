// import { CSS_UNITS } from '../constants/css-units';

import { EM, REM } from '../constants/css-property-keyword';
import { UNIT_VALUE_PATTERN } from '../constants/unit-value-pattern';
import { normalizeCssCalcText } from './normalize-css-calc-text';

export function parseUnitValue(token: string | number, defaultUnit?: string) {
    let value: any = '';
    let unit: string = '';
    let unitToken: string = '';
    if (typeof token === 'number') {
        value = token;
        unit = defaultUnit || '';
    } else {
        const matches = token.match(UNIT_VALUE_PATTERN);
        // ['0.5deg', '0.5', 'deg', index: 0, input: '0.5deg', groups: undefined]
        if (matches) {
            value = +matches[1];
            unit = unitToken = matches[2] || '';
            /**
             * 當無單位值且 defaultUnit === 'rem'，
             * 將 pxValue / 16 轉為 remValue
             */
            if (!unit) {
                if (defaultUnit === REM || defaultUnit === EM) {
                    value = value / 16;
                }
                unit = defaultUnit || '';
            }
        } else {
            value = token.indexOf('calc(') === -1
                ? token
                : normalizeCssCalcText(token);
        }
    }
    return { value, unit, unitToken }
}