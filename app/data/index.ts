import type { AppData } from '~/types'
import type { BaseDocument } from '~/types/base'
import { assertBaseDocument } from '~/lib/base-validate'
import { normalizeData } from '~/lib/normalize'
import { adaptBase } from './adapt-v2'
import raw from './base.json'

/**
 * Dokument bazowy v2 (`app/data/base.json`) jest źródłem prawdy. Widoki nadal
 * czytają kształt v1, więc tutaj wykonujemy jedną translację przez adapter;
 * gdy UI przejdzie na v2, wystarczy zwrócić `base` bez adaptacji.
 */
assertBaseDocument(raw)

export const base: BaseDocument = raw

export const data: AppData = normalizeData(adaptBase(base))
