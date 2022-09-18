const { React, getModuleByDisplayName, getModule } = require('powercord/webpack');
const { AsyncComponent } = require('powercord/components');
const { TextInput, Category, SwitchItem } = require('powercord/components/settings');
const FormText = AsyncComponent.from(getModuleByDisplayName('FormText'));
const FormTitle = AsyncComponent.from(getModuleByDisplayName('FormTitle'));
const Flex = AsyncComponent.from(getModuleByDisplayName('flex'));
const FlexChild = getModule(['flexChild'], false).flexChild;

module.exports = class Settings extends React.Component {
   constructor(props) {
      super();
   }

   render() {
      const { getSetting, updateSetting, toggleSetting } = this.props;
      return (
         <div>
            <Category
               name={'Notifications'}
               description={'Customize notification behaviour.'}
               opened={getSetting('notificationsExpanded', false)}
               onChange={() => updateSetting('notificationsExpanded', !getSetting('notificationsExpanded', false))}
            >
               <TextInput
                  note={'Notify via webhook.'}
                  value={getSetting('webhookURL', '')}
                  onChange={(value) => {
                     updateSetting('webhookURL', value.length === 0 ? '' : value);
                  }}
               >
                  Webhook URL
               </TextInput>
               <SwitchItem
                  note={'Display in-app toasts.'}
                  value={getSetting('appToasts', true)}
                  onChange={() => toggleSetting('appToasts')}
               >
                  In-App Toasts
               </SwitchItem>
               <SwitchItem
                  note={'Display in-app toasts only when discord is focused.'}
                  value={getSetting('appToastsFocus', true)}
                  onChange={() => toggleSetting('appToastsFocus')}
               >
                  Focus In-App Toasts
               </SwitchItem>
               <SwitchItem
                  note={'Display desktop notifications.'}
                  value={getSetting('desktopNotif', true)}
                  onChange={() => toggleSetting('desktopNotif')}
               >
                  Desktop Notifications
               </SwitchItem>
               <SwitchItem
                  note={"Display desktop notifications even when discord is focused."}
                  value={getSetting('desktopNotifFocus', false)}
                  onChange={() => toggleSetting('desktopNotifFocus')}
               >
                  Focus Notifications
               </SwitchItem>
            </Category>
            <Category
               name={'Events'}
               description={'Turn off notifications for individual events.'}
               opened={getSetting('typesExpanded', false)}
               onChange={() => updateSetting('typesExpanded', !getSetting('typesExpanded', false))}
            >
               <SwitchItem
                  note={'Display notifications when someone removes you from their friends list.'}
                  value={getSetting('remove', true)}
                  onChange={() => toggleSetting('remove')}
               >
                  Remove
               </SwitchItem>
               <SwitchItem
                  note={'Display notifications when you get kicked from a server.'}
                  value={getSetting('kick', true)}
                  onChange={() => toggleSetting('kick')}
               >
                  Kick
               </SwitchItem>
               <SwitchItem
                  note={'Display notifications when you get banned from a server.'}
                  value={getSetting('ban', true)}
                  onChange={() => toggleSetting('ban')}
               >
                  Ban
               </SwitchItem>
               <SwitchItem
                  note={'Display notifications when you get kicked from a group chat.'}
                  value={getSetting('group', true)}
                  onChange={() => toggleSetting('group')}
               >
                  Group
               </SwitchItem>
               <SwitchItem
                  note={'Display notifications when someone cancells their friend request.'}
                  value={getSetting('friendCancel', true)}
                  onChange={() => toggleSetting('friendCancel')}
               >
                  Cancelled Friend Request
               </SwitchItem>
            </Category>
            <Category
               name={'Text'}
               description={'Customize the notifications the way you want.'}
               opened={getSetting('textExpanded', false)}
               onChange={() => updateSetting('textExpanded', !getSetting('textExpanded', false))}
            >
               <Flex style={{ justifyContent: 'center' }}>
                  <div className={FlexChild}>
                     <FormTitle>Remove & Cancel Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %username
                        <br></br>
                        %userid
                        <br></br>
                        %usertag
                     </FormText>
                  </div>
                  <div className={FlexChild}>
                     <FormTitle>Kick & Ban Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %servername
                        <br></br>
                        %serverid
                     </FormText>
                  </div>
                  <div className={FlexChild}>
                     <FormTitle>Group Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %groupname
                        <br></br>
                        %groupid
                     </FormText>
                  </div>
               </Flex>
               <br></br>
               <TextInput
                  value={getSetting('removeText', '%username#%usertag removed you as a friend.')}
                  onChange={(v) => updateSetting('removeText', v)}
                  note={'The text the notification will have when someone removes you.'}
               >
                  Removed Text
               </TextInput>
               <TextInput
                  value={getSetting('friendCancelText', '%username#%usertag cancelled their friend request.')}
                  onChange={(v) => updateSetting('friendCancelText', v)}
                  note={'The text the notification will have when someone cancells their friend request.'}
               >
                  Cancelled Friend Request Text
               </TextInput>
               <TextInput
                  value={getSetting('kickText', "You've been kicked from %servername")}
                  onChange={(v) => updateSetting('kickText', v)}
                  note={'The text the notification will have when you get kicked from a server.'}
               >
                  Kicked Text
               </TextInput>
               <TextInput
                  value={getSetting('banText', "You've been banned from %servername")}
                  onChange={(v) => updateSetting('banText', v)}
                  note={'The text the notification will have when you get banned from a server.'}
               >
                  Banned Text
               </TextInput>
               <TextInput
                  value={getSetting('groupText', "You've been removed from the group %groupname")}
                  onChange={(v) => updateSetting('groupText', v)}
                  note={'The text the notification will have when you get kicked from a group chat.'}
               >
                  Group Text
               </TextInput>
            </Category>
         </div>
      );
   }
};
