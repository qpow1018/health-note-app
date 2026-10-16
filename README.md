# Health Note App

기존 Health Note 웹을 표시하는 Android/iOS용 최소 Expo + TypeScript 앱입니다. 네이티브 헤더·하단 메뉴·라우터·전역 상태·인증 브리지는 없습니다.

## 준비 및 실행

Node.js 22 LTS 이상을 사용하세요. 이 프로젝트는 Node 22.23.3, Expo SDK 58, React Native 0.88, WebView 14.0.1로 초기화했습니다. 정확한 의존성은 package-lock.json에 고정되어 있습니다.

```sh
npm ci
cp .env.example .env
# .env의 EXPO_PUBLIC_WEB_URL에 웹 주소 입력
npm start
```

EXPO_PUBLIC_WEB_URL은 HTTP(S) 절대 주소입니다. 공백·누락·잘못된 주소이면 앱에서 설정 방법을 안내합니다. 배포 주소는 제공되지 않아 기본값을 넣지 않았습니다. EXPO_PUBLIC 변수는 번들에 공개되므로 비밀 키를 넣지 마세요. 변경 후 앱을 완전히 다시 로드하고, 반영되지 않으면 `npx expo start --clear`로 다시 시작하세요. 배포 번들은 다시 생성해야 합니다.

SDK 58을 지원하는 Expo Go에서 QR을 열거나, Android 에뮬레이터를 실행한 뒤 `npm run android`를 사용하세요. iOS Simulator는 macOS + Xcode + 설치된 iOS 런타임이 필요하며 `npm run ios`로 엽니다. 이 앱의 WebView는 Android/iOS용입니다. Expo 웹 실행은 제공하지 않습니다.

## 실제 Android 휴대폰 연결

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다. 호환되는 Expo Go를 휴대폰에 설치합니다.
2. 기존 웹 저장소에서 사용자가 직접 `npm run dev -- --host 0.0.0.0`으로 Vite를 실행합니다. 이 작업에서는 웹 파일을 수정하지 않았습니다.
3. PC의 LAN IP가 예를 들어 `192.168.0.10`이면 앱 `.env`에 `EXPO_PUBLIC_WEB_URL=http://192.168.0.10:5173`을 설정합니다. 이는 설명용 IP이므로 실제 PC 주소로 바꾸세요.
4. 앱 폴더에서 `npm start` 후 Expo Go로 QR을 스캔합니다. 방화벽에서 Metro와 Vite 연결을 허용하고 Wi-Fi의 기기 간 통신 차단 여부를 확인하세요.
5. USB 사용 시 Android 개발자 옵션과 USB 디버깅을 켜고 PC 연결을 승인합니다. `adb devices`에서 `device` 상태를 확인하세요. `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:5173 tcp:5173` 후 `npx expo start --localhost --android`를 사용하면 웹 주소도 `http://127.0.0.1:5173`으로 설정할 수 있습니다. USB reverse를 해제하면 이 주소는 동작하지 않습니다.

휴대폰의 `localhost`는 휴대폰 자신입니다. PC를 가리키지 않습니다. Android Studio 기본 에뮬레이터에서는 `http://10.0.2.2:5173`으로 호스트 PC에 접근할 수 있습니다. Expo의 `--tunnel`은 Metro 연결만 해결하며 별도 Vite 웹 주소를 공개하지 않습니다.

**HTTP 제약:** Expo Go와 자체 빌드의 네트워크 정책은 다를 수 있습니다. Android cleartext 정책과 iOS ATS 때문에 HTTP가 거절될 수 있습니다. 앱은 전역 HTTP 예외를 추가하지 않습니다. HTTPS 개발 URL을 우선 사용하세요. 자체 빌드에서 HTTP가 꼭 필요하면 후속 작업으로 개발 빌드에 한정한 Android cleartext / iOS ATS 예외를 설정하고 재빌드해야 합니다. LAN HTTP는 secure context가 아니므로 웹의 `crypto.randomUUID()` 같은 API도 제한될 수 있습니다. HTTPS에서는 신뢰 가능한 인증서를 사용하세요.

## 구성과 책임

- `App.tsx`: URL 검증, WebView, 로딩, 네트워크/주 문서 HTTP 오류 안내, 시작 URL부터 재시도, Android 뒤로가기, 외부 이동 차단.
- `src/historyScript.ts`: Android에서 SPA URL 변경 이벤트가 누락되는 경우를 보완하는 전용 history 알림. 토큰이나 인증 데이터는 다루지 않습니다.
- `tests/history.test.cjs`: history 알림의 최초 진입, push/replace/pop, reload/pageshow, 중복 주입 테스트.

Android 뒤로가기는 React Router의 `history.state.idx > 0`이면 `history.back()`, 그 외 WebView 문서 이력이 있으면 `goBack()`을 사용합니다. 이력이 없는 시작 화면은 BackHandler에서 false를 반환하여 OS 기본 동작에 맡깁니다. 앱 시작 URL이 상세 경로여도 최초 Router idx는 0입니다. 단순 `history.length`는 이전 브라우저 이력과 replace 이동을 구분하지 못하므로 사용하지 않습니다. 이 스크립트는 현재 웹의 BrowserRouter 구현에 의존합니다.

safe area는 네이티브 SafeAreaProvider/ SafeAreaView가 네 방향 모두 담당합니다. 상태바는 밝은 화면용 dark 스타일입니다. WebView는 안전 영역 안에 배치하고 iOS 자동 콘텐츠 inset을 끕니다. 웹은 `viewport-fit=cover`가 없는 viewport와 CSS `env(safe-area-inset-*)`를 사용합니다. 안전 영역 안의 WebView에서는 웹 inset이 0인 구성을 기대하며, 웹의 기본 페이지 padding과 56px 하단 메뉴 공간은 그대로 필요합니다. CSS를 주입해 기존 여백을 지우지 않습니다. 노치·가로 회전·키보드·제스처/3버튼 내비게이션에서 실제 inset은 기기 검증이 필요합니다.

기존 모달과 BottomSheet는 HTML `<dialog>.showModal()`과 `cancel` 이벤트를 사용합니다. 네이티브 모달을 중복 구현하지 않습니다. 열린 dialog에서 Android 뒤로가기가 웹 cancel을 전달하는지는 WebView/OS별 확인이 필요합니다. 이번 앱은 dialog 상태를 native history로 바꾸거나 닫기 브리지를 만들지 않습니다.

외부 origin과 비 HTTP 스킴 이동은 안내 후 차단하며 자동으로 외부 브라우저를 열지 않습니다. originWhitelist는 모든 요청을 onShouldStartLoadWithRequest 정책으로 보내기 위한 설정이며, 실제 허용 범위는 설정된 웹 origin입니다.

## Google 로그인: 후속 작업 필요

읽기 전용 확인 대상: `/Users/choewonjin/Desktop/workspace/health-note`의 `src/app/App.tsx`, `AuthBoundary.tsx`, `src/features/auth/signInWithGoogle.ts`, `useAuthSession.ts`, `src/lib/supabase.ts`, Modal/BottomSheet와 safe area SCSS.

현재 웹은 Supabase `flowType: 'pkce'`, `signInWithOAuth({provider:'google', options:{redirectTo: origin + '/', skipBrowserRedirect:true}})` 후 `window.location.assign(data.url)`로 이동합니다. 돌아오면 웹 Supabase 클라이언트가 초기화·getSession·onAuthStateChange로 세션을 복원합니다. AuthBoundary는 세션 없이는 운동·루틴 라우트 대신 로그인 화면을 표시합니다. 따라서 이번 앱에서는 로그인 연동 전까지 로그인 화면만 보이는 것이 예상됩니다.

Google OAuth는 개발자가 제어하는 embedded user agent에서 진행하면 안 됩니다. 현재 URL 이동을 WebView에서 그대로 실행하는 것으로 로그인이 완료된다고 볼 수 없습니다. 앱은 외부 OAuth 이동을 안내 후 차단합니다. 브라우저에서 기존 웹에 로그인해도 WebView의 쿠키/localStorage 및 PKCE verifier 저장소는 별개이므로 자동 로그인되지 않습니다.

후속 작업에서 다음을 함께 결정하고 구현해야 합니다.

1. 시스템 인증 브라우저(Expo WebBrowser/AuthSession) 또는 Google 네이티브 SDK 중 인증 방식 선택. 시스템 브라우저만 여는 것으로 완료되지 않습니다.
2. 웹 로그인 버튼의 앱 전용 시작 경로/메시지, 콜백 처리 및 세션 수신 계약 설계. PKCE를 시작한 저장소의 verifier와 코드 교환 주체를 일치시켜야 합니다.
3. 앱의 고유 scheme 또는 검증된 App/Universal Link와 callback, Supabase redirect 허용 목록, Google OAuth 클라이언트/redirect 설정. 네이티브 SDK 선택 시 실제 application ID/bundle ID와 Android 서명 인증서 등 플랫폼 설정도 필요합니다.
4. 인증 결과를 WebView 웹 origin의 Supabase 세션으로 안전하게 연결하는 방식, 일회용 교환·허용 origin·취소·만료·로그아웃 동기화 정의. 장기 토큰을 URL 쿼리나 로그로 넘기지 않습니다.
5. 개발 빌드와 Android/iOS 실제 환경에서 성공·취소·콜드 스타트·재실행·세션 갱신 검증. Expo Go만으로 최종 OAuth callback 구성을 검증하지 않습니다.

로그인 브리지, 세션 전달, Supabase 설정 변경은 이번 작업에 포함하지 않았습니다. 푸시·카메라·헬스 데이터·스토어 배포도 제외합니다.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx expo install --check
```

2026-10-16: 타입·린트·history 단위 테스트 3개, Android/iOS Metro 번들 생성, Expo 개발 서버 기동과 `/status` 응답, 온라인 의존성 호환 검사 통과. `build`는 JS/Hermes 번들 검사이며 APK/IPA 네이티브 컴파일이나 설치 성공을 의미하지 않습니다.

실제 Android 연결 장치가 없고 iOS Simulator 서비스를 사용할 수 없어 실제 앱 화면·재시도·하드웨어 뒤로가기·React Router 실제 WebView 이동·dialog·safe area·Google 로그인은 미확인입니다. 특히 인증이 필요한 기존 웹 내부 흐름은 인증 연동 이후 검증해야 합니다.

기기 확인 순서: URL 누락 안내 → 도달 불가능한 URL의 오류/재시도 → 웹 로그인 표시 → 외부 OAuth 차단 → 인증 연동 후 `/` → `/exercise` → 상세 → 뒤로 이동 → 시작 화면의 기본 뒤로가기. replace 이동·상세 새로고침·모달 열림 상태도 확인하세요.

설치 시 npm audit: 22건(높음 15, 보통 7). 주로 Expo/Metro/React Native의 전이 의존성 경로이며 일부 자동 수정 제안은 Expo 44/RN 0.72로 변경하므로 강제 적용하지 않았습니다. 배포 준비 시 upstream 호환 패치와 실제 advisory 영향을 재확인해야 합니다.

## 공식 참고 문서

- [Expo 초기화 및 blank-typescript](https://docs.expo.dev/more/create-expo/)
- [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/)
- [WebView API](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
- [Expo 환경변수](https://docs.expo.dev/guides/environment-variables/)
- [Expo safe area](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Google OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies)
- [Expo 인증](https://docs.expo.dev/guides/authentication/)
- [Supabase 모바일 deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
