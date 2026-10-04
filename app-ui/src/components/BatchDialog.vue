<template>
  <v-dialog v-model="show" aria-role="dialog" max-width="620" persistent scrollable aria-modal
    :fullscreen="smAndDown" @keydown.stop="_onKeys">
    <v-card>
      <v-card-title class="text-wrap" :class="{ 'text-error': error }">
        <v-icon v-if="error" class="mr-2" :icon="mdiAlertCircle" />{{ message }}
      </v-card-title>
      <v-card-text v-if="detail || image">
        <div v-if="detail" class="text-body-2 mb-2 batch-dialog-detail">{{ detail }}</div>
        <v-img v-if="image" :src="'data:image/jpeg;base64,' + image" contain />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-2">
        <div class="action-grid">
          <v-btn v-for="action in actions" :key="action.key" class="action-tile" stacked
            :color="action.color" :prepend-icon="action.icon" @click.prevent="action.handler">
            {{ action.text }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mdiAlertCircle, mdiArrowRight, mdiCheck, mdiClose, mdiRefresh, mdiReplay } from '@mdi/js';
import { useDisplay } from 'vuetify';
import Constants from '../classes/constants';

export default {
  name: 'BatchDialog',

  setup() {
    const { smAndDown } = useDisplay();
    return {
      mdiAlertCircle,
      smAndDown
    };
  },

  data() {
    return {
      message: null,
      detail: null,
      image: null,
      error: false,
      show: false,
      onFinish: null,
      onNext: null,
      onRescan: null,
      onRetry: null,
      onRefreshRetry: null
    };
  },

  computed: {
    actions() {
      const actions = [
        { key: 'cancel', text: this.$t('batch-dialog.btn-cancel'), icon: mdiClose, color: 'warning', handler: this.cancel }
      ];
      if (this.onRescan) {
        actions.push({ key: 'rescan', text: this.$t('batch-dialog.btn-rescan'), icon: mdiReplay, handler: this.rescan });
      }
      if (this.onRefreshRetry) {
        actions.push({ key: 'refresh-retry', text: this.$t('batch-dialog.btn-refresh-retry'), icon: mdiRefresh, handler: this.refreshRetry });
      }
      if (this.onRetry) {
        actions.push({ key: 'retry', text: this.$t('batch-dialog.btn-retry'), icon: mdiReplay, color: 'primary', handler: this.retry });
      }
      if (this.onFinish) {
        actions.push({ key: 'finish', text: this.$t('batch-dialog.btn-finish'), icon: mdiCheck, color: 'green', handler: this.finish });
      }
      if (this.onNext) {
        actions.push({ key: 'next', text: this.$t('batch-dialog.btn-next'), icon: mdiArrowRight, color: 'primary', handler: this.next });
      }
      return actions;
    }
  },

  methods: {
    _onKeys(event) {
      if (event.keyCode === Constants.Keys.enter) {
        if (this.onNext) {
          this.next();
        } else if (this.onRetry) {
          this.retry();
        }
      }
    },

    _close(callback) {
      this.show = false;
      if (callback) {
        callback();
      }
    },

    cancel() {
      this._close();
    },

    finish() {
      this._close(this.onFinish);
    },

    rescan() {
      this._close(this.onRescan);
    },

    retry() {
      this._close(this.onRetry);
    },

    refreshRetry() {
      this._close(this.onRefreshRetry);
    },

    next() {
      this._close(this.onNext);
    },

    /**
     * @param {Object} options
     * @param {string} options.message
     * @param {string} [options.detail]
     * @param {string} [options.image] - base64 jpeg
     * @param {boolean} [options.error]
     * @param {function} [options.onFinish]
     * @param {function} [options.onNext]
     * @param {function} [options.onRescan]
     * @param {function} [options.onRetry]
     * @param {function} [options.onRefreshRetry]
     */
    open(options) {
      this.message = options.message;
      this.detail = options.detail || null;
      this.image = options.image;
      this.error = options.error || false;
      this.onFinish = options.onFinish || null;
      this.onRescan = options.onRescan || null;
      this.onNext = options.onNext || null;
      this.onRetry = options.onRetry || null;
      this.onRefreshRetry = options.onRefreshRetry || null;
      this.show = true;
    }
  }
};
</script>

<style scoped>
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom);
}

.action-tile {
  min-height: 72px;
  height: auto !important;
  margin: 0 !important;
  white-space: normal;
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.8rem;
  line-height: 1.1;
}

.action-tile :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}

.batch-dialog-detail {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
