import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Button, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { historyScript } from './src/historyScript';

const configuredUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();
function readWebUrl() {
  try {
    const url = new URL(configuredUrl ?? '');
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
const webUrl = readWebUrl();

export default function App() {
  const webView = useRef<WebView<object>>(null);
  const nativeCanGoBack = useRef(false);
  const routerIndex = useRef(0);
  const loadingUrl = useRef(webUrl?.href);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!webUrl || error) return false;
      if (routerIndex.current > 0) {
        webView.current?.injectJavaScript('window.history.back(); true;');
        return true;
      }
      if (nativeCanGoBack.current) {
        webView.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [error]);

  function retry() {
    nativeCanGoBack.current = false;
    routerIndex.current = 0;
    setError(false);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        {!webUrl ? (
          <View style={styles.message}>
            <Text style={styles.title}>웹 주소 설정이 필요해요</Text>
            <Text>.env.example을 .env로 복사하고 EXPO_PUBLIC_WEB_URL에 Health Note 웹 주소를 입력한 뒤 Expo를 다시 시작해 주세요. HTTP 또는 HTTPS 주소를 사용하세요.</Text>
          </View>
        ) : error ? (
          <View style={styles.message}>
            <Text style={styles.title}>웹에 연결하지 못했어요</Text>
            <Text>네트워크 연결과 웹 서버 주소를 확인해 주세요.</Text>
            <Button title="다시 시도" onPress={retry} />
          </View>
        ) : (
          <View style={styles.container}>
            <WebView<object>
              key={attempt}
              ref={webView}
              style={styles.container}
              source={{ uri: webUrl.href }}
              originWhitelist={['*']}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              injectedJavaScript={historyScript}
              onMessage={({ nativeEvent }) => {
                try {
                  if (new URL(nativeEvent.url).origin !== webUrl.origin) return;
                  const message = JSON.parse(nativeEvent.data);
                  if (message.type === 'health-note-history' &&
                      Number.isInteger(message.index) && message.index >= 0 &&
                      new URL(message.url).origin === webUrl.origin) {
                    routerIndex.current = message.index;
                  }
                } catch { /* 이 앱의 history 메시지만 처리한다. */ }
              }}
              onNavigationStateChange={(state) => {
                nativeCanGoBack.current = state.canGoBack;
              }}
              onShouldStartLoadWithRequest={({ url }) => {
                if (url === 'about:blank') return true;
                try {
                  if (new URL(url).origin === webUrl.origin) return true;
                } catch { /* 잘못된 주소도 WebView 밖으로 보내지 않는다. */ }
                Alert.alert('외부 페이지 이동 안내', 'Google 로그인은 시스템 인증 브라우저와 WebView 세션 연결 작업이 필요해요. 현재 앱에서는 외부 인증 페이지로 이동하지 않습니다.');
                return false;
              }}
              onOpenWindow={() => Alert.alert('외부 페이지 이동 안내', '새 창은 지원하지 않습니다. Google 로그인 연동은 후속 작업이 필요해요.')}
              onLoadStart={({ nativeEvent }) => {
                loadingUrl.current = nativeEvent.url;
                setLoading(true);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setError(true)}
              onHttpError={({ nativeEvent }) => {
                if (nativeEvent.url === loadingUrl.current) setError(true);
              }}
              onContentProcessDidTerminate={retry}
              onRenderProcessGone={() => setError(true)}
            />
            {loading && (
              <View style={styles.loading} pointerEvents="none" accessibilityRole="progressbar">
                <ActivityIndicator size="large" />
                <Text>Health Note를 불러오고 있어요.</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  message: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', gap: 16 },
});
