<template>
  <v-app>
    <transition name="fade">
      <div v-if="maskRef" id="mask">
        <v-card v-if="progress" class="scan-progress pa-4" elevation="8">
          <div class="d-flex justify-space-between text-body-2 mb-2">
            <span>{{ progressLabel }}</span>
            <span v-if="progress.active && progress.progress !== null">{{ Math.floor(progress.progress) }}%</span>
          </div>
          <v-progress-linear color="primary" height="8" rounded
            :indeterminate="!progress.active || progress.progress === null"
            :model-value="progress.progress || 0" />
        </v-card>
        <div v-else style="position: absolute; top: 49%; left: 49%">
          <v-progress-circular indeterminate color="primary" />
        </div>
      </div>
    </transition>

    <navigation :app-color="appColor" />

    <v-main>
      <v-container fluid>
        <router-view v-slot="{ Component }" @mask="mask" @notify="notify" @progress="onProgress">
          <transition name="fade" mode="out-in" :duration="150">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>

import Constants from './classes/constants';
import ManifestBuilder from './classes/manifest-builder';
import Storage from './classes/storage';
import Navigation from './components/Navigation.vue';
import { useTheme } from 'vuetify';

const storage = Storage.instance();

export default {
  name: 'App',
  components: {
    Navigation,
  },
  inject: ['toastr'],

  setup() {
    const vuetifyTheme = useTheme();
    let theme = storage.settings.theme;
    if (theme === Constants.Themes.System) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? Constants.Themes.Dark
        : Constants.Themes.Light;
    }
    vuetifyTheme.change(theme);
    const manifest = ManifestBuilder.create()
      .withDark(theme === Constants.Themes.Dark)
      .withStorage(storage)
      .build();

    const element = document.createElement('link');
    element.setAttribute('rel', 'manifest');
    element.setAttribute('href', `data:manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`);
    document.querySelector('head').appendChild(element);
  },

  data() {
    return {
      maskRef: 0,
      progress: null,
      appColor: storage.settings.appColor
    };
  },

  computed: {
    progressLabel() {
      if (!this.progress.active) {
        return this.$t('scan.message:waiting');
      }
      return this.progress.page
        ? `${this.$t('scan.message:scanning')} (${this.$t('scan.message:page')} ${this.progress.page})`
        : this.$t('scan.message:scanning');
    }
  },

  beforeMount() {
    const locale = new URLSearchParams(window.location.search).get('locale')
      || storage.settings.locale
      || navigator.languages[0]
      || 'en';
    const settings = storage.settings;
    settings.locale = locale;
    storage.settings = settings;
  },

  mounted() {
    this.$vuetify.rtl = Constants.RtlLocales.includes(storage.settings.locale);    
    this.$i18n.locale = storage.settings.locale;

    // Default route if connected
    if (this.$route.matched.length === 0) {
      this.$router.replace('/scan');
    }
  },

  methods: {
    mask(add) {
      this.maskRef += add;
    },

    onProgress(progress) {
      this.progress = progress;
    },

    notify(notification) {
      const types = {
        's': 'success',
        'i': 'info',
        'e': 'error'
      };

      const timeout = notification.type === 'e' ? 10000 : 2000;
      const message = {
        type: types[notification.type],
        position: 'toast-bottom-right',
        msg: notification.message,
        timeout: timeout,
        progressbar: false
      };
      this.$toastr.Add(message);
    }
  }
};
</script>

<style>

input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

input[type=number] {
  appearance: textfield;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.scan-progress {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(360px, calc(100% - 32px));
}

/* Keep toasts clear of the bottom action bar on small screens */
@media (max-width: 959px) {
  .toast-container.toast-bottom-right {
    bottom: calc(96px + env(safe-area-inset-bottom));
  }
}

#mask {
  position: fixed;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,.4);
  top: 0;
  left: 0;
  z-index: 10000;
}
</style>
