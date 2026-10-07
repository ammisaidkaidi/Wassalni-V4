<script setup lang="ts">
/** Task 11.2 — in-app messaging thread for one reservation. */
import { nextTick, ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { MessageRow } from '../../types';

const props = defineProps<{ apiBase: string; myRole: 'customer' | 'driver' }>();

const { t } = useI18n();
const open = ref(false);
const messages = ref<MessageRow[]>([]);
const body = ref('');
const msg = ref('');
const bottomRef = ref<HTMLDivElement | null>(null);

async function load(): Promise<void> {
  try {
    const r = await api<{ messages: MessageRow[] }>(`${props.apiBase}/conversation`);
    messages.value = r.messages;
    await api(`${props.apiBase}/conversation/read`, { method: 'POST', body: {} }).catch(() => undefined);
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

watch(open, (isOpen) => {
  if (isOpen) void load();
});

watch(messages, () => {
  void nextTick(() => bottomRef.value?.scrollIntoView({ block: 'end' }));
});

async function send(e: Event): Promise<void> {
  e.preventDefault();
  if (!body.value.trim()) return;
  msg.value = '';
  try {
    await api(`${props.apiBase}/conversation/messages`, { method: 'POST', body: { body: body.value.trim() } });
    body.value = '';
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <button v-if="!open" class="btn ghost small" @click="open = true">{{ t('reservationExtras.messagesBtn') }}</button>
  <div v-else class="mini-card" style="width: 100%">
    <div class="notif-panel-head" style="border: none; padding: 0">
      <strong>{{ t('reservationExtras.messagingTitle') }}</strong>
      <button class="btn ghost small" @click="open = false">{{ t('reservationExtras.close') }}</button>
    </div>
    <p v-if="msg" style="color: var(--danger)" role="alert">{{ msg }}</p>
    <div class="chat-thread">
      <p v-if="messages.length === 0" class="empty">{{ t('reservationExtras.noMessages') }}</p>
      <div v-for="m in messages" :key="m.id" :class="`chat-msg${m.sender_role === myRole ? ' mine' : ''}`">
        {{ m.body }}
        <span class="chat-meta">{{ fmtDateTime(m.created_at) }}</span>
      </div>
      <div ref="bottomRef" />
    </div>
    <form class="form-inline" @submit="void send($event)">
      <input
        v-model="body"
        :placeholder="t('reservationExtras.messagePlaceholder')"
        :aria-label="t('reservationExtras.messagePlaceholder')"
      />
      <button class="btn primary small">{{ t('reservationExtras.send') }}</button>
    </form>
  </div>
</template>
