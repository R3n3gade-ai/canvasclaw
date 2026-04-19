import type CreativeEditorSDK from '@cesdk/cesdk-js';
import {
  BlurAssetSource,
  ColorPaletteAssetSource,
  CropPresetsAssetSource,
  DemoAssetSources,
  EffectsAssetSource,
  FiltersAssetSource,
  PagePresetsAssetSource,
  StickerAssetSource,
  TextAssetSource,
  TextComponentAssetSource,
  TypefaceAssetSource,
  UploadAssetSources,
  VectorShapeAssetSource,
} from '@cesdk/cesdk-js/plugins';

const STARTER_TEMPLATE_URL =
  'https://cdn.img.ly/packages/imgly/plugin-marketing-asset-source-web/1.0.0/assets/templates/animated-beauty-product.zip';

function configureDock(cesdk: CreativeEditorSDK) {
  cesdk.engine.editor.setSetting('dock/hideLabels', true);
  cesdk.engine.editor.setSetting('dock/iconSize', 'normal');

  cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, [
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.templates',
      icon: '@imgly/Template',
      label: 'libraries.ly.img.templates.label',
      entries: ['ly.img.templates'],
    },
    { id: 'ly.img.separator', key: 'ly.img.separator' },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.elements',
      icon: '@imgly/Library',
      label: 'component.library.elements',
      entries: [
        'ly.img.image',
        'ly.img.video',
        'ly.img.audio',
        'ly.img.text',
        'ly.img.vector.shape',
        'ly.img.sticker',
      ],
    },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.upload',
      icon: '@imgly/Upload',
      label: 'libraries.ly.img.upload.label',
      entries: ['ly.img.upload'],
    },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.video',
      icon: '@imgly/Video',
      label: 'libraries.ly.img.video.label',
      entries: ['ly.img.video', 'ly.img.video.upload'],
    },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.audio',
      icon: '@imgly/Audio',
      label: 'libraries.ly.img.audio.label',
      entries: ['ly.img.audio', 'ly.img.audio.upload'],
    },
    {
      id: 'ly.img.assetLibrary.dock',
      key: 'ly.img.text',
      icon: '@imgly/Text',
      label: 'libraries.ly.img.text.label',
      entries: ['ly.img.text'],
    },
  ]);
}

function registerActions(cesdk: CreativeEditorSDK) {
  cesdk.actions.register('saveScene', async () => {
    const scene = await cesdk.engine.scene.saveToString();
    await cesdk.utils.downloadFile(scene, 'text/plain;charset=UTF-8');
  });

  cesdk.actions.register('importScene', async ({ format = 'scene' } = {}) => {
    if (format === 'archive') {
      const archiveUrl = await cesdk.utils.loadFile({
        accept: '.zip',
        returnType: 'objectURL',
      });

      try {
        await cesdk.engine.scene.loadFromArchiveURL(archiveUrl);
      } finally {
        URL.revokeObjectURL(archiveUrl);
      }
    } else {
      const scene = await cesdk.utils.loadFile({
        accept: '.scene',
        returnType: 'text',
      });

      await cesdk.engine.scene.loadFromString(scene);
    }

    await cesdk.actions.run('zoom.toPage', { page: 'first', autoFit: true });
  });

  cesdk.actions.register('exportScene', async ({ format }) => {
    if (format === 'archive') {
      const archive = await cesdk.engine.scene.saveToArchive();
      await cesdk.utils.downloadFile(archive, 'application/zip');
      return;
    }

    const scene = await cesdk.engine.scene.saveToString();
    await cesdk.utils.downloadFile(scene, 'text/plain;charset=UTF-8');
  });

  cesdk.actions.register('exportVideo', async () => {
    const { blobs, options } = await cesdk.utils.export({ mimeType: 'video/mp4' });
    await cesdk.utils.downloadFile(blobs[0], options.mimeType);
  });

  cesdk.actions.register('uploadFile', (file, _onProgress, context) => {
    return cesdk.utils.localUpload(file, context);
  });
}

async function addStarterPlugins(cesdk: CreativeEditorSDK) {
  await cesdk.addPlugin(new BlurAssetSource());
  await cesdk.addPlugin(new ColorPaletteAssetSource());
  await cesdk.addPlugin(new CropPresetsAssetSource());
  await cesdk.addPlugin(
    new UploadAssetSources({
      include: ['ly.img.image.upload', 'ly.img.video.upload', 'ly.img.audio.upload'],
    }),
  );
  await cesdk.addPlugin(
    new DemoAssetSources({
      include: ['ly.img.templates.video.*', 'ly.img.image.*', 'ly.img.audio.*', 'ly.img.video.*'],
    }),
  );
  await cesdk.addPlugin(new EffectsAssetSource());
  await cesdk.addPlugin(new FiltersAssetSource());
  await cesdk.addPlugin(
    new PagePresetsAssetSource({
      include: [
        'ly.img.page.presets.instagram.*',
        'ly.img.page.presets.facebook.*',
        'ly.img.page.presets.x.*',
        'ly.img.page.presets.linkedin.*',
        'ly.img.page.presets.pinterest.*',
        'ly.img.page.presets.tiktok.*',
        'ly.img.page.presets.youtube.*',
        'ly.img.page.presets.video.*',
      ],
    }),
  );
  await cesdk.addPlugin(new StickerAssetSource());
  await cesdk.addPlugin(new TextAssetSource());
  await cesdk.addPlugin(new TextComponentAssetSource());
  await cesdk.addPlugin(new TypefaceAssetSource());
  await cesdk.addPlugin(new VectorShapeAssetSource());
}

export async function initAdvancedVideoEditor(cesdk: CreativeEditorSDK): Promise<void> {
  cesdk.resetEditor();
  cesdk.ui.setView('advanced');

  cesdk.i18n.setTranslations({
    en: {
      'libraries.ly.img.video.label': 'Video clips',
      'libraries.ly.img.audio.label': 'Audio beds',
      'component.fileOperation.export': 'Export video',
      'common.close': 'Close studio',
    },
  });

  configureDock(cesdk);
  registerActions(cesdk);
  await addStarterPlugins(cesdk);

  try {
    await cesdk.actions.run('editor.checkBrowserSupport', {
      videoDecode: 'block',
      videoEncode: 'warn',
    });
  } catch {
    // The editor remains usable even when support checks are unavailable.
  }

  try {
    await cesdk.loadFromArchiveURL(STARTER_TEMPLATE_URL);
  } catch {
    await cesdk.engine.scene.createVideo();
    await cesdk.actions.run('zoom.toPage', { page: 'first', autoFit: true });
  }
}