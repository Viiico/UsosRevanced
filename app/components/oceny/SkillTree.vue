<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowUpRight } from 'lucide-vue-next'
import { terms } from '~/data/subjects'
import { termsForNode } from '~/lib/requirements'
import { NODE_KIND_LABEL, childSummary, nodeIcon } from '~/lib/node-meta'
import { formatDate, formatWeekday } from '~/lib/format'

const { current, children, canGoUp, goUp, select, progress } = useGrades()

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const icon = computed(() => nodeIcon(current.value))
const kindLabel = computed(() => NODE_KIND_LABEL[current.value.kind])
const summary = computed(() => childSummary(current.value))
const nextTerm = computed(() => termsForNode(current.value, terms)[0] ?? null)
const hasPoints = computed(() => progress.value.max > 0)

/** Opis i założenia idą do dymka, żeby hub miał zawsze tę samą wysokość. */
const infoText = computed(() =>
  [current.value.info, current.value.assumption ? `Założenie: ${current.value.assumption}` : null]
    .filter(Boolean)
    .join(' · '),
)

/** Wcięcie szyny łączącej rodzic → dzieci: środek pierwszej i ostatniej kolumny. */
const railInset = computed(() => `${50 / Math.max(children.value.length, 1)}%`)
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="flex-row items-center justify-between gap-3 pb-0">
      <div class="flex items-center gap-2">
        <span class="eyebrow">Skilltree</span>
        <Separator orientation="vertical" class="h-3" />
        <span class="text-[11px] text-muted-foreground">{{ kindLabel }}</span>
      </div>
      <Button v-if="canGoUp" variant="outline" size="sm" class="gap-1.5" @click="goUp">
        <ArrowLeft class="size-3.5" />
        Poziom wyżej
      </Button>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col pt-3">
      <div
        class="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/[0.04] to-transparent p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <component :is="icon" class="size-4 shrink-0 text-primary" />
              <span class="eyebrow text-primary/80">{{ kindLabel }}</span>
              <InfoHint v-if="infoText" :text="infoText" />
            </div>

            <h2 class="mt-1.5 text-lg leading-tight font-semibold tracking-tight text-balance sm:text-xl">
              {{ current.name }}
            </h2>

            <p v-if="current.description" class="mt-1 max-w-prose text-sm text-muted-foreground">
              {{ current.description }}
            </p>
            <p v-else-if="summary" class="mt-1 text-sm text-muted-foreground">
              {{ summary }}
              <template v-if="nextTerm">
                · najbliższy termin {{ formatDate(nextTerm.date) }}
              </template>
            </p>
          </div>

          <div v-if="hasPoints" class="shrink-0 text-right">
            <div class="tnum text-2xl leading-none font-semibold">
              {{ progress.earned
              }}<span class="text-base font-normal text-muted-foreground">/{{ progress.max }}</span>
            </div>
            <div class="eyebrow mt-1.5">punktów</div>
          </div>
        </div>
      </div>

      <div v-if="children.length && compact" class="mt-5 flex flex-wrap gap-3">
        <div
          v-for="child in children"
          :key="child.id"
          class="min-w-[10.5rem] flex-1 basis-[calc(20%-0.6rem)] self-stretch sm:max-w-[21rem]"
        >
          <SkillNodeCard :node="child" @select="select" />
        </div>
      </div>

      <div v-else-if="children.length" class="relative mt-0 pt-6">
        <div class="absolute top-0 left-1/2 hidden h-6 w-px -translate-x-1/2 bg-border sm:block" />
        <div
          class="absolute top-6 hidden h-px bg-border sm:block"
          :style="{ left: railInset, right: railInset }"
        />

        <div class="flex flex-col gap-2 sm:flex-row sm:gap-0">
          <div
            v-for="child in children"
            :key="child.id"
            class="group/branch relative flex-1 sm:px-1.5"
          >
            <div
              class="absolute top-0 left-1/2 hidden h-3 w-px -translate-x-1/2 bg-border sm:block"
            />
            <div class="sm:pt-3">
              <SkillNodeCard :node="child" @select="select" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-4 space-y-2">
        <div
          v-if="nextTerm"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/25 px-4 py-3"
        >
          <div class="min-w-0">
            <div class="eyebrow">Termin</div>
            <p class="mt-1 truncate text-sm font-medium">
              {{ formatWeekday(nextTerm.date) }}, {{ formatDate(nextTerm.date) }}
              <span v-if="nextTerm.start" class="tnum text-muted-foreground">
                · {{ nextTerm.start }}<template v-if="nextTerm.end">-{{ nextTerm.end }}</template>
              </span>
            </p>
          </div>
          <Badge v-if="nextTerm.requirement" variant="outline" class="whitespace-normal">
            {{ nextTerm.requirement }}
          </Badge>
        </div>

        <div
          v-if="current.info"
          class="rounded-lg border border-border/70 bg-secondary/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
        >
          {{ current.info }}
        </div>

        <p v-if="!nextTerm && !current.info" class="text-sm text-muted-foreground">
          Ten element nie ma jeszcze terminu ani opisu.
        </p>
      </div>

      <div v-if="!children.length" class="mt-auto pt-4">
        <NuxtLink
          to="/kalendarz"
          class="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
        >
          Zobacz w kalendarzu
          <ArrowUpRight class="size-3" />
        </NuxtLink>
      </div>
    </CardContent>
  </Card>
</template>
