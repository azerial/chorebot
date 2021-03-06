let notifications = false;
let toastContainer = document.querySelector('#toast');

let savedChore = {
    title: '',
    instructions: '',
    creator: '',
    difficulty: 1,
    frequency: [1, 2, 3, 4, 5]
}

const notify = ( message ) => {
    let data = { message: message };
    toastContainer.MaterialSnackbar.showSnackbar(data)
}

const notificationsFab = new Vue({
    el: '#notification-button',
    data: {
        notifications: notifications
    },
    methods: {
        supressNotifications: function() {
            notifications = !notifications;
            this.notifications = notifications;
            notify(`Notifications ${ notifications ? 'on' : 'off' }.`);
        }
    }
})

const addFab = new Vue({
    el: '#add-chore',
    data: {
        modalOpened: false
    },
    methods: {
        toggleModal: () => this.modalOpened ? closeModal() : openModal(),
    }
});


const newChoreList = ( list ) => {
    new Vue({
        el: '#chore-list',
        data: function () {
            return {choreList: list}
        },
        methods: {
            deleteChore: function (id) {
                fetch('/delete', 
                    {
                        method: 'POST',
                        mode: 'cors',
                        cache: 'no-cache',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        redirect: 'follow',
                        referrer: 'no-referrer',
                        body: JSON.stringify({id: id, notification: notifications}),
                    })
                        .then(res => {
                            location.reload();
                        })
                        .catch(err => {
                            console.log(err);
                        });
            },
            closeModal: (chore) => closeModal(chore)
        }
    })
}

const newUserList = ( list ) => {
    console.log(list)
    new Vue({
        el: '#user-list',
        data: function () {
            return {userList: list}
        },
        methods: {
            getRandomInt() {
                min = 1;
                max = 9;
                return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
            },
            toggleActive: function(user) {
                user.isActive = !user.isActive;
                fetch('/update-user', 
                    {
                        method: 'POST',
                        mode: 'cors',
                        cache: 'no-cache',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        redirect: 'follow',
                        referrer: 'no-referrer',
                        body: JSON.stringify(user),
                    })
                    .then(res => res.json())
                    .then(json => {
                        let i = this.userList.findIndex( u => u.id == json.id );

                        Vue.set(this.userList, i, json);

                    })
                    .catch(err => {
                        console.log(err);
                    });
            }
        }
    })
}

const dialog = document.querySelector('dialog');

const openModal = () => {
    dialog.showModal();
}
const closeModal = ( saved ) => {
    if (saved) savedChore = saved;
    dialog.close();
}

const addChoreForm = new Vue({
    el: '#add-chore-form',
    data: function() {
        return {chore: savedChore}
    },
    methods: {
        save: function () {
            fetch('/add', 
            {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow',
                referrer: 'no-referrer',
                body: JSON.stringify({...this.chore, notification: notifications}),
            })
                .then(res => {
                    location.reload();
                })
                .catch(err => {
                    console.log(err);
                });
        },
        closeModal: (chore) => closeModal(chore)
    }
  });

const fetchChores = () => {
    fetch('/chores')
        .then(res => res.json())
        .then(json => {
            newChoreList(json);
        })
        .catch(err => {
            console.log(err);
        });
}

const fetchUsers = () => {
    fetch('/users')
        .then(res => res.json())
        .then(json => {
            newUserList(json);
        })
        .catch(err => {
            console.log(err);
        });
}

fetchChores();
fetchUsers();

const leftNav = new Vue({
    el: '#left-nav',
    data: {},
    methods: {
        assignNewChores: () => assignNewChores(),
    }
});

const assignNewChores = () => {
    fetch('/make-new-assignments')
        .then(res => notify('New chores assigned.'))
        .catch(err => {
            console.log(err);
        });
}