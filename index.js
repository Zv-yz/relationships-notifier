const { FluxDispatcher: Dispatcher, getModule } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');
const { Plugin } = require('powercord/entities');
const { NotifyWebhook } = require('./util.js');
const Settings = require('./components/Settings');

const moment = getModule(['momentProperties'], false);
const { getCurrentUser, getUser } = getModule(['getCurrentUser', 'getUser'], false);
const { getGuilds, getGuild } = getModule(['getGuilds'], false);
const ChannelStore = getModule(['openPrivateChannel'], false);
const { getChannels } = getModule(['getChannels'], false);

module.exports = class RelationshipsNotifier extends Plugin {
   async startPlugin() {
      powercord.api.settings.registerSettings('relationships-notifier', {
         category: this.entityID,
         label: 'Relationships Notifier',
         render: Settings
      });

      this.cachedGroups = [...Object.values(getChannels())].filter((c) => c.type === 3);
      this.cachedGuilds = [...Object.values(getGuilds())];

      Dispatcher.subscribe('RELATIONSHIP_REMOVE', this.relationshipRemove);
      Dispatcher.subscribe('GUILD_MEMBER_REMOVE', this.memberRemove);
      Dispatcher.subscribe('GUILD_BAN_ADD', this.banCreate);
      Dispatcher.subscribe('GUILD_CREATE', this.guildCreate);
      Dispatcher.subscribe('GUILD_JOIN', this.guildJoin);
      Dispatcher.subscribe('CHANNEL_CREATE', this.channelCreate);
      Dispatcher.subscribe('CHANNEL_DELETE', this.channelDelete);

      this.mostRecentlyRemovedID = null;
      this.mostRecentlyLeftGuild = null;
      this.mostRecentlyLeftGroup = null;
      this.mostRecentlyLurking = null;

      const removeRelationship = await getModule(['removeRelationship']);
      inject('rn-relationship-check', removeRelationship, 'removeRelationship', (args, res) => {
         this.mostRecentlyRemovedID = args[0];
         return res;
      });

      const leaveGuild = await getModule(['leaveGuild']);
      inject('rn-guild-leave-check', leaveGuild, 'leaveGuild', (args, res) => {
         this.mostRecentlyLeftGuild = args[0];
         this.removeGuildFromCache(args[0]);
         return res;
      });

      const closePrivateChannel = await getModule(['closePrivateChannel']);
      inject('rn-group-check', closePrivateChannel, 'closePrivateChannel', (args, res) => {
         this.mostRecentlyLeftGroup = args[0];
         this.removeGroupFromCache(args[0]);
         return res;
      });
   }

   pluginWillUnload() {
      powercord.api.settings.unregisterSettings('relationships-notifier');
      uninject('rn-relationship-check');
      uninject('rn-guild-join-check');
      uninject('rn-guild-leave-check');
      uninject('rn-group-check');
      Dispatcher.unsubscribe('RELATIONSHIP_REMOVE', this.relationshipRemove);
      Dispatcher.unsubscribe('GUILD_BAN_ADD', this.banCreate);
      Dispatcher.unsubscribe('GUILD_MEMBER_REMOVE', this.memberRemove);
      Dispatcher.unsubscribe('GUILD_CREATE', this.guildCreate);
      Dispatcher.unsubscribe('GUILD_JOIN', this.guildJoin);
      Dispatcher.unsubscribe('CHANNEL_CREATE', this.channelCreate);
      Dispatcher.unsubscribe('CHANNEL_DELETE', this.channelDelete);
   }

   guildCreate = (data) => {
      if (this.mostRecentlyLurking == data.guild.id) {
         this.mostRecentlyLurking = null;
         this.removeGuildFromCache(data.guild.id);
         return;
      }
      this.cachedGuilds.push(getGuild(data.guild.id));
   };

   guildJoin = (data) => {
      if (!data.lurker) return;
      this.mostRecentlyLurking = data.guildId;
   };

   channelCreate = (data) => {
      if ((data.channel && data.channel.type !== 3) || this.cachedGroups.find((g) => g.id === data.channel.id)) return;
      this.cachedGroups.push(data.channel);
   };

   channelDelete = (data) => {
      if ((data.channel && data.channel.type !== 3) || !this.cachedGroups.find((g) => g.id === data.channel.id)) return;
      let channel = this.cachedGroups.find((g) => g.id == data.channel.id);
      if (!channel || channel === null) return;
      this.removeGroupFromCache(channel.id);
      if (this.settings.get('group', true)) {
         this.fireToast('group', channel, "You've been removed from the group %groupname");
      }
   };

   banCreate = (data) => {
      if (data.user.id !== getCurrentUser().id) return;
      let guild = this.cachedGuilds.find((g) => g.id == data.guildId);
      if (!guild || guild === null) return;
      this.removeGuildFromCache(guild.id);
      if (this.settings.get('ban', true)) {
         this.fireToast('ban', guild, "You've been banned from %servername");
      }
      this.mostRecentlyLeftGuild = null;
   }

   removeGroupFromCache = (id) => {
      const index = this.cachedGroups.indexOf(this.cachedGroups.find((g) => g.id == id));
      if (index == -1) return;
      this.cachedGroups.splice(index, 1);
   };

   removeGuildFromCache = (id) => {
      const index = this.cachedGuilds.indexOf(this.cachedGuilds.find((g) => g.id == id));
      if (index == -1) return;
      this.cachedGuilds.splice(index, 1);
   };

   relationshipRemove = (data) => {
      if (data.relationship.type === 4) return;
      if (this.mostRecentlyRemovedID === data.relationship.id) {
         this.mostRecentlyRemovedID = null;
         return;
      }
      let user = getUser(data.relationship.id);
      if (!user || user === null) return;
      switch (data.relationship.type) {
         case 1:
            if (this.settings.get('remove', true)) {
               this.fireToast('remove', user);
            }
            break;
         case 3:
            if (this.settings.get('friendCancel', true)) {
               this.fireToast('friendCancel', user);
            }
            break;
      }
      this.mostRecentlyRemovedID = null;
   };

   memberRemove = (data) => {
      if (this.mostRecentlyLeftGuild === data.guildId) {
         this.mostRecentlyLeftGuild = null;
         return;
      }
      if (data.user.id !== getCurrentUser().id) return;
      let guild = this.cachedGuilds.find((g) => g.id == data.guildId);
      if (!guild || guild === null) return;
      this.removeGuildFromCache(guild.id);
      if (this.settings.get('kick', true)) {
         this.fireToast('kick', guild, "You've been kicked/banned from %servername");
      }
      this.mostRecentlyLeftGuild = null;
   };

   random() {
      let result = '';
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < characters.length; i++) {
         result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
   }

   fireToast(type, instance, defaults) {
      let text = this.replaceWithVars(type, this.settings.get(`${type}Text`, defaults), instance);
      let buttons = null;
      let title_type
      let type_data = {
         remove: 'Removed Friend',
         friendCancel: 'Friend Cancelled',
         kick: 'Server Kicked',
         ban: 'Server Banned',
         group: 'Group Removed'
      }
      if (type_data[type]) {
         title_type = type_data[type]
      } else {
         title_type = 'Unknown'
      }

      if (['friendCancel', 'remove'].includes(type)) {
         buttons = [{
            text: 'Open DM',
            color: 'green',
            size: 'small',
            look: 'outlined',
            onClick: () => {
               ChannelStore.openPrivateChannel(instance.id);
            }
         }];
      }

      if (this.settings.get('appToasts', true)) {
         if (this.settings.get('appToastsFocus', true) && document.hasFocus() || !this.settings.get('appToastsFocus', true) && !document.hasFocus()) {
            powercord.api.notices.sendToast(`rn_${this.random(20)}`, {
               header: `[RN] ${title_type}`,
               content: text,
               type: 'danger',
               buttons
            });
         }
      }

      if (this.settings.get('desktopNotif', true)) {
         if (!document.hasFocus() || this.settings.get('desktopNotifFocus', false)) {
            let notification = new Notification(`[Relationships Notifier] ${title_type}`, {
               body: text,
               icon: (instance.members || instance.recipients) ? (instance.icon && `https://cdn.discordapp.com/${instance.type == 3 ?
                  'channel-icons' :
                  'icons'
                  }/${instance.id}/${instance.icon}.${instance.icon.startsWith('a_') ?
                     'gif' :
                     'png'
                  }?size=4096`
               ) : instance.getAvatarURL?.()
            });

            if (['friendCancel', 'remove'].includes(type)) {
               notification.onclick = () => { ChannelStore.openPrivateChannel(instance.id) }
            };
         };
      }
      this.webhookfunc(type, title_type, instance);
   };

   webhookfunc(type, name, object){
      let Data = {}
      if (type == 'remove' || type == 'friendCancel') {
         Data = {"title": `**[RN] ${name}**`, "color": 3092790, "fields": [{"name": "**User:**", "value": object.tag || 'N/A', "inline": true}, {"name": "**ID:**", "value": object.id, "inline": true}, {"name": "**Mention:**", "value": `<@${object.id}>`, "inline": true}], "footer": {"text": `• Account: ${getCurrentUser().tag}`, "icon_url": `https://cdn.discordapp.com/avatars/${getCurrentUser().id}/${getCurrentUser().avatar}.${getCurrentUser().avatar.startsWith('a_') ? 'gif' : 'png'}`}, "timestamp": new Date()};
         if (object.avatar) Data["thumbnail"] = {"url": `https://cdn.discordapp.com/avatars/${object.id}/${object.avatar}.${object.avatar.startsWith('a_') ? 'gif' : 'png'}`}
      } else if (type == 'ban' || type == 'kick') {
         Data = {"title": `**[RN] ${name}**`, "color": 3092790, "fields": [{"name": "**Name:**", "value": object.name, "inline": true}, {"name": "**ID:**", "value": object.id, "inline": true}, {"name": "**Joined at:**", "value": moment(object.joinedAt).format('LLL'), "inline": true}, {"name": "**Members:**", "value": object.members || '???', "inline": true}, {"name": "**Maximum Members:**", "value": object.maxMembers || '???', "inline": true}, {"name": "**Owner Mention/ID:**", "value": `<@${object.ownerId}> (${object.ownerId})`, "inline": true}, {"name": "**Boosts:**", "value": `${object.premiumSubscriberCount} (Tier ${object.premiumTier})`, "inline": true}, {"name": "**Vanity URL:**", "value": object.vanityURLCode && `https://discord.gg/${object.vanityURLCode}` || 'None.', "inline": true}], "footer": {"text": `• Account: ${getCurrentUser().tag}`, "icon_url": `https://cdn.discordapp.com/avatars/${getCurrentUser().id}/${getCurrentUser().avatar}.${getCurrentUser().avatar.startsWith('a_') ? 'gif' : 'png'}`}, "timestamp": new Date()}
         if (object.icon) Data["thumbnail"] = {"url": `https://cdn.discordapp.com/icons/${object.id}/${object.icon}.${object.icon.startsWith('a_') ? 'gif' : 'png'}`}
         if (object.banner) Data["image"] = {"url": `https://cdn.discordapp.com/banners/${object.id}/${object.banner}.${object.banner.startsWith('a_') ? 'gif' : 'png'}?size=512`}
      } else if (type == 'group') {
         Data = {"title": `**[RN] ${name}**`, "color": 3092790, "fields": [{"name": "**Name:**", "value": object.name.length === 0 ? object.recipients.map((id) => getUser(id).username).join(', ') : object.name, "inline": true}, {"name": "**ID:**", "value": object.id, "inline": true}, {"name": "**Members:**", "value": object.recipients.length, "inline": true}, {"name": "**Owner Mention/ID:**", "value": `<@${object.ownerId}> (${object.ownerId})`, "inline": true}, {"name": "**Recipients:**", "value": this.convRecipients(object.recipients, '<@', '>').join(', '), "inline": true}], "footer": {"text": `• Account: ${getCurrentUser().tag}`, "icon_url": `https://cdn.discordapp.com/avatars/${getCurrentUser().id}/${getCurrentUser().avatar}.${getCurrentUser().avatar.startsWith('a_') ? 'gif' : 'png'}`}, "timestamp": new Date()}
         if (object.icon) Data["thumbnail"] = {"url": `https://cdn.discordapp.com/channel-icons/${object.id}/${object.icon}.${object.icon.startsWith('a_') ? 'gif' : 'png'}`} /*i know this is impossible gif, but who knows */
      }
      try {
         NotifyWebhook(this.settings.get('webhookURL', ''), {"embeds": [Data]})
      } catch(err) {
         console.log(`Error posting webhook: ${err}`)
      }
   }

   convRecipients(array, first, end){
      let users = []
      let newStr = ''
      for (const str in array) {
         newStr = ''
         newStr += first
         for (const char in array[str]) {
            newStr += array[str][char]
         }
         newStr += end
         users.push(newStr)
      }
      return users.length !== 0 && users || ['Invalid recipients']
   }

   replaceWithVars(type, text, object) {
      if (type === 'remove' || type === 'friendCancel') {
         return text.replace('%username', object.username).replace('%newline', '\n').replace('%usertag', object.discriminator).replace('%userid', object.id);
      } else if (type === 'kick' || type === 'ban') {
         return text.replace('%servername', object.name).replace('%newline', '\n').replace('%serverid', object.id).replace('%vanityurl', object.vanityURLCode ? object.vanityURLCode : 'N/A').replace('%newline', '\n');
      } else if (type === 'group') {
         let name = object.name.length === 0 ? object.recipients.map((id) => getUser(id).username).join(', ') : object.name;
         return text.replace('%groupname', name).replace('%newline', '\n').replace('%groupid', object.id);
      } else {
         let name = object.name.length === 0 ? object.recipients.map((id) => getUser(id).username).join(', ') : object.name;
         return text.replace('%name', name).replace('%newline', '\n');
      }
   }
};
