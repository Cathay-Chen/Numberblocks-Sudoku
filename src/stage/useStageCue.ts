import { showFriend, type ShowFriendInput } from './present';

// 必须在这次点击里发出声音。拖到绘制之后，按钮声会先叠上来，手势解锁也可能错过。
export function useStageCue() {
  return (cue: ShowFriendInput) => {
    showFriend(cue);
  };
}
